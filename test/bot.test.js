import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import worker from '../src/worker.js';
import { botPolicy } from '../src/bot.js';
import { wranglerConfig as previewConfig } from '../scripts/preview.js';
import {
  BOT_DIRECTORY,
  fileHashes,
  listedChecksum,
  publishedDigest,
  releaseAsset,
  sha256,
  updateBot,
  verifyBot,
} from '../scripts/update-bot.js';
import { read } from './helpers.js';

// The updater tests extract committed zips with the system `unzip`.
const fixture = (name) => readFileSync(new URL(`fixtures/bot/${name}`, import.meta.url));
const lock = JSON.parse(read('bot.lock.json'));
const version = lock.release.replace(/^bmair-v/, '');
const assets = (served = []) => ({
  fetch: async (request) => {
    served.push(request.url);
    const missing = new URL(request.url).pathname.includes('missing');
    return new Response('asset', { status: missing ? 404 : 200, headers: { 'Cache-Control': 'public, max-age=0, must-revalidate' } });
  },
});

test('bot: Open the AI - /bot serves the release page and everything it links to', async () => {
  const page = read('public/bot/index.html');
  const links = [...page.matchAll(/\b(?:href|src)="(?![a-z]+:|\/|#)([^"]+)"/g)].map((match) => match[1]);
  assert.ok(links.length > 0, 'the page links its own files');
  for (const link of links) assert.ok(lock.files[link], `${link} is part of the release`);
  assert.ok(Object.keys(lock.files).some((file) => file.endsWith('.wasm')), 'the release includes its engine');

  const served = [];
  const response = await worker.fetch(new Request('https://button.men/bot/'), { ASSETS: assets(served) });
  assert.equal(await response.text(), 'asset');
  assert.deepEqual(served, ['https://button.men/bot/']);
});

test('bot: Ask for a move - /bot and its workers may reach only /bot itself', async () => {
  for (const path of ['/bot', '/bot/', '/bot/app-0420b4f68e33/worker.js', '/bot/missing.js']) {
    const response = await worker.fetch(new Request(`https://button.men${path}`), { ASSETS: assets() });
    const policy = response.headers.get('Content-Security-Policy');
    assert.equal(policy, botPolicy('https://button.men'), path);
    assert.match(policy, /connect-src https:\/\/button\.men\/bot\/;/);
    assert.doesNotMatch(policy, /api|\*/);
    assert.match(policy, /frame-src 'none'/);
    assert.equal(response.headers.get('Cross-Origin-Opener-Policy'), 'same-origin', path);
  }
  const app = await worker.fetch(new Request('https://button.men/'), { ASSETS: assets() });
  assert.equal(app.headers.get('Content-Security-Policy'), null);
});

test('bot: the content-hashed release folder is cached for good, everything else revalidates', async () => {
  const cache = async (path) => (await worker.fetch(new Request(`https://button.men${path}`), { ASSETS: assets() }))
    .headers.get('Cache-Control');
  assert.equal(await cache('/bot/app-0420b4f68e33/bmair.wasm'), 'public, max-age=31536000, immutable');
  assert.equal(await cache('/bot/'), 'public, max-age=0, must-revalidate');
  assert.equal(await cache('/bot/app-0420b4f68e33/missing.js'), 'public, max-age=0, must-revalidate');
  assert.equal(await cache('/bot/app-folder/app.js'), 'public, max-age=0, must-revalidate');
});

test('bot: Find the AI - every page with the site navigation links to /bot beside its specifications entry', () => {
  const publicDirectory = resolve('public');
  const pages = (directory) => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return path === BOT_DIRECTORY ? [] : pages(path);
    return entry.name.endsWith('.html') ? [path] : [];
  });
  const specifications = /<a [^>]*href="\/specs\/"[^>]*>Specifications<\/a>|<span class="navbar-text">Specifications<\/span>/;
  const bot = /^<a class="btn btn-sm btn-outline-primary" href="\/bot\/">Bot<\/a>$/;
  const withNavigation = pages(publicDirectory).filter((page) => /<nav\b/.test(readFileSync(page, 'utf8')));
  assert.ok(withNavigation.length >= 3);
  for (const page of withNavigation) {
    const name = relative(publicDirectory, page);
    const entries = /<nav\b[\s\S]*?<\/nav>/.exec(readFileSync(page, 'utf8'))[0]
      .split('\n').map((line) => line.trim()).filter(Boolean);
    const at = entries.findIndex((entry) => specifications.test(entry));
    assert.notEqual(at, -1, `${name} has a specifications entry`);
    assert.ok(bot.test(entries[at + 1] ?? '') || bot.test(entries[at - 1] ?? ''), `${name} links /bot beside it`);
  }
});

test('bot: Preview a pull request - previews deploy the pull request\'s whole public/, /bot included', () => {
  // Whether a real preview serves /bot needs a deployment; this checks what the preview script uploads.
  const source = resolve('pr-source');
  assert.equal(previewConfig({ prNumber: 7, sourceDir: source }).assets.directory, resolve(source, 'public'));
  assert.ok(existsSync(join(BOT_DIRECTORY, 'index.html')));
});

test('bot: See what is deployed - the lock names the release, its download and checksum', () => {
  assert.match(lock.release, /^bmair-v\d+\.\d+\.\d+$/);
  assert.equal(lock.url, releaseAsset(version).url);
  assert.match(lock.sha256, /^[0-9a-f]{64}$/);
  assert.match(read('public/bot/build-info.txt'), new RegExp(`^Version: bmair ${version.replaceAll('.', '\\.')} \\(`, 'm'));
});

test('bot: Served files drift from the release - every file under public/bot matches the lock', () => {
  // CI's `update-bot.js --verify` also checks the lock against the published release itself.
  assert.deepEqual(fileHashes(BOT_DIRECTORY), lock.files);
});

test('bot: release names are checked before anything is downloaded', () => {
  for (const bad of ['', '0.28', 'v0.28.0', '0.28.0; rm -rf /', '../0.28.0']) {
    assert.throws(() => releaseAsset(bad), /release version/, bad);
  }
  assert.deepEqual(releaseAsset('0.28.0'), {
    release: 'bmair-v0.28.0',
    asset: 'bmair-0.28.0-web-release.zip',
    url: 'https://github.com/danlangford/bmai/releases/download/bmair-v0.28.0/bmair-0.28.0-web-release.zip',
    sumsUrl: 'https://github.com/danlangford/bmai/releases/download/bmair-v0.28.0/SHA256SUMS',
    apiUrl: 'https://api.github.com/repos/danlangford/bmai/releases/tags/bmair-v0.28.0',
  });
});

test('bot: SHA256SUMS lookups find the exact asset, in either checksum format', () => {
  const sums = `${'a'.repeat(64)}  bmair-0.28.0-web-release.zip.sig\n${'b'.repeat(64)} *bmair-0.28.0-web-release.zip\n`;
  assert.equal(listedChecksum(sums, 'bmair-0.28.0-web-release.zip'), 'b'.repeat(64));
  assert.throws(() => listedChecksum(sums, 'bmair-0.29.0-web-release.zip'), /does not list/);
});

test('bot: only an immutable, published release with a recorded digest is trusted', () => {
  const asset = 'web.zip';
  const release = { tag_name: 'bmair-v1.0.0', immutable: true, assets: [{ name: asset, digest: `sha256:${'c'.repeat(64)}` }] };
  assert.equal(publishedDigest(release, asset), 'c'.repeat(64));
  assert.throws(() => publishedDigest({ ...release, immutable: false }, asset), /not an immutable, published release/);
  assert.throws(() => publishedDigest({ ...release, draft: true }, asset), /not an immutable/);
  assert.throws(() => publishedDigest({ ...release, prerelease: true }, asset), /not an immutable/);
  assert.throws(() => publishedDigest({ ...release, assets: [{ name: asset }] }, asset), /no SHA-256 digest/);
});

function workspace(t) {
  const work = mkdtempSync(join(tmpdir(), 'bot-release-'));
  t.after(() => rmSync(work, { recursive: true, force: true }));
  const directory = join(work, 'public', 'bot');
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, 'old.html'), 'previous release');
  return { directory, lockFile: join(work, 'bot.lock.json') };
}

// Serves a fake 9.9.9 release; `published` overrides what GitHub reports.
function publish(t, zip, published = {}) {
  const { url, sumsUrl, apiUrl, asset } = releaseAsset('9.9.9');
  const checksum = sha256(zip);
  const responses = {
    [apiUrl]: JSON.stringify({
      tag_name: 'bmair-v9.9.9',
      immutable: published.immutable ?? true,
      assets: [{ name: asset, digest: `sha256:${published.digest ?? checksum}` }],
    }),
    [sumsUrl]: `${published.listed ?? checksum}  ${asset}\n`,
    [url]: zip,
  };
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async (requested) => (String(requested) in responses
    ? new Response(responses[String(requested)])
    : new Response('missing', { status: 404 }));
}

function assertUntouched({ directory, lockFile }) {
  assert.deepEqual(Object.keys(fileHashes(directory)), ['old.html']);
  assert.equal(existsSync(lockFile), false);
}

test('bot: Update to another release - a verified release replaces public/bot and the lock', async (t) => {
  const paths = workspace(t);
  publish(t, fixture('release.zip'));

  const written = await updateBot('9.9.9', paths);

  assert.deepEqual(Object.keys(fileHashes(paths.directory)), ['app-1/bmair.wasm', 'index.html']);
  assert.deepEqual(JSON.parse(readFileSync(paths.lockFile, 'utf8')), written);
  assert.equal(written.release, 'bmair-v9.9.9');
  assert.equal(written.sha256, sha256(fixture('release.zip')));
  assert.equal(written.files['app-1/bmair.wasm'], sha256('engine'));
});

test('bot: Update to another release - anything but the published release changes nothing', async (t) => {
  const zip = fixture('release.zip');
  for (const [published, error] of [
    [{ listed: '0'.repeat(64) }, /SHA256SUMS lists 0{64}/],
    [{ digest: '1'.repeat(64) }, /GitHub records 1{64}/],
    [{ immutable: false }, /not an immutable, published release/],
  ]) {
    await t.test(String(error), async (t) => {
      const paths = workspace(t);
      publish(t, zip, published);
      await assert.rejects(updateBot('9.9.9', paths), error);
      assertUntouched(paths);
    });
  }
});

test('bot: Update to another release - an archive that could escape or mislead is refused', async (t) => {
  for (const [name, error] of [
    ['symlink.zip', /Not a plain file: settings/],
    ['nested.zip', /no index\.html at its root/],
    ['absolute.zip', /could not extract .* cleanly/],
    ['corrupt.zip', /could not extract .* cleanly/],
  ]) {
    await t.test(name, async (t) => {
      const paths = workspace(t);
      publish(t, fixture(name));
      await assert.rejects(updateBot('9.9.9', paths), error);
      assertUntouched(paths);
    });
  }
});

test('bot: Served files drift from the release - verification re-derives every file from the published release', async (t) => {
  const paths = workspace(t);
  publish(t, fixture('release.zip'));
  const written = await updateBot('9.9.9', paths);
  await verifyBot(paths);

  // An edited page with a lock regenerated to match it is still not the release.
  writeFileSync(join(paths.directory, 'index.html'), '<!doctype html><script src="/x.js"></script>');
  writeFileSync(paths.lockFile, JSON.stringify({ ...written, files: fileHashes(paths.directory) }));
  await assert.rejects(verifyBot(paths), /file list is not the contents of the published/);

  writeFileSync(paths.lockFile, JSON.stringify(written));
  await assert.rejects(verifyBot(paths), /public\/bot is not the contents of the published/);

  writeFileSync(paths.lockFile, JSON.stringify({ ...written, sha256: '2'.repeat(64) }));
  await assert.rejects(verifyBot(paths), /does not record the published/);
});
