import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import worker from '../src/worker.js';
import { wranglerConfig as previewConfig } from '../scripts/preview.js';
import {
  BOT_DIRECTORY,
  fileHashes,
  listedChecksum,
  releaseAsset,
  sha256,
  updateBot,
} from '../scripts/update-bot.js';
import { read } from './helpers.js';

const lock = JSON.parse(read('bot.lock.json'));
const version = lock.release.replace(/^bmair-v/, '');

test('bot: Open the AI - /bot serves the release page and the engine it loads', async () => {
  const page = read('public/bot/index.html');
  const assets = [...page.matchAll(/(?:href|src)="(app-[0-9a-f]+\/[^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(assets.map((asset) => asset.split('/').pop()).sort(), ['app.js', 'style.css']);
  const folder = assets[0].split('/')[0];
  for (const file of [...assets, `${folder}/worker.js`, `${folder}/wasi.js`, `${folder}/bmair.wasm`]) {
    assert.ok(lock.files[file], file);
  }

  let served;
  const env = { ASSETS: { fetch: async (request) => { served = request.url; return new Response('bot'); } } };
  const response = await worker.fetch(new Request('https://button.men/bot/'), env);
  assert.equal(await response.text(), 'bot');
  assert.equal(served, 'https://button.men/bot/');
});

test('bot: Find the AI - every page links to /bot right after its specifications entry', () => {
  const specifications = /<a class="btn btn-sm btn-outline-primary" href="\/specs\/">Specifications<\/a>|<span class="navbar-text">Specifications<\/span>/;
  const bot = '<a class="btn btn-sm btn-outline-primary" href="/bot/">Bot</a>';
  for (const page of ['public/index.html', 'public/about.html', 'public/specs/index.html']) {
    const nav = /<nav\b[\s\S]*?<\/nav>/.exec(read(page))[0];
    const entry = specifications.exec(nav);
    assert.ok(entry, `${page} has a specifications entry`);
    assert.equal(nav.slice(entry.index + entry[0].length).trimStart().slice(0, bot.length), bot, page);
  }
});

test('bot: Preview a pull request - previews deploy the pull request\'s public/, which holds /bot', () => {
  const source = resolve('pr-source');
  const config = previewConfig({ prNumber: 7, sourceDir: source });
  assert.equal(config.assets.directory, resolve(source, 'public'));
  assert.equal(resolve(source, 'public/bot'), join(config.assets.directory, 'bot'));
  assert.ok(existsSync(join(BOT_DIRECTORY, 'index.html')));
});

test('bot: Ask for a move - the page may only load from its own site', () => {
  const policy = /http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(read('public/bot/index.html'))?.[1];
  assert.ok(policy, 'the page declares a content security policy');
  assert.match(policy, /default-src 'self'/);
  assert.doesNotMatch(policy, /connect-src/);
  assert.doesNotMatch(policy, /https?:/);
});

test('bot: See what is deployed - the lock names the release, its download and checksum', () => {
  assert.match(lock.release, /^bmair-v\d+\.\d+\.\d+$/);
  assert.equal(lock.url, releaseAsset(version).url);
  assert.match(lock.sha256, /^[0-9a-f]{64}$/);
  assert.match(read('public/bot/build-info.txt'), new RegExp(`^Version: bmair ${version.replaceAll('.', '\\.')} \\(`, 'm'));
});

test('bot: Served files drift from the release - every file under public/bot matches the lock', () => {
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
  });
});

test('bot: SHA256SUMS lookups find the exact asset, in either checksum format', () => {
  const sums = `${'a'.repeat(64)}  bmair-0.28.0-web-release.zip.sig\n${'b'.repeat(64)} *bmair-0.28.0-web-release.zip\n`;
  assert.equal(listedChecksum(sums, 'bmair-0.28.0-web-release.zip'), 'b'.repeat(64));
  assert.throws(() => listedChecksum(sums, 'bmair-0.29.0-web-release.zip'), /does not list/);
});

function fakeRelease(t) {
  const work = mkdtempSync(join(tmpdir(), 'bot-release-'));
  t.after(() => rmSync(work, { recursive: true, force: true }));
  const site = join(work, 'site');
  mkdirSync(join(site, 'app-1'), { recursive: true });
  writeFileSync(join(site, 'index.html'), '<!doctype html>');
  writeFileSync(join(site, 'app-1', 'bmair.wasm'), 'engine');
  const zipped = spawnSync('zip', ['-q', '-r', join(work, 'web.zip'), '.'], { cwd: site });
  assert.equal(zipped.status, 0, 'zip is available');
  const zip = readFileSync(join(work, 'web.zip'));
  const directory = join(work, 'public', 'bot');
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, 'old.html'), 'previous release');
  return { zip, directory, lockFile: join(work, 'bot.lock.json') };
}

function serve(t, files) {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async (url) => {
    const name = String(url).split('/').pop();
    return name in files ? new Response(files[name]) : new Response('missing', { status: 404 });
  };
}

test('bot: Update to a new release - a verified download replaces public/bot and the lock', async (t) => {
  const { zip, directory, lockFile } = fakeRelease(t);
  serve(t, {
    'bmair-9.9.9-web-release.zip': zip,
    SHA256SUMS: `${sha256(zip)}  bmair-9.9.9-web-release.zip\n`,
  });

  const written = await updateBot('9.9.9', { directory, lockFile });

  assert.deepEqual(Object.keys(fileHashes(directory)), ['app-1/bmair.wasm', 'index.html']);
  assert.deepEqual(JSON.parse(readFileSync(lockFile, 'utf8')), written);
  assert.equal(written.release, 'bmair-v9.9.9');
  assert.equal(written.sha256, sha256(zip));
  assert.equal(written.files['app-1/bmair.wasm'], sha256('engine'));
});

test('bot: Update to a new release - a download that fails its checksum changes nothing', async (t) => {
  const { zip, directory, lockFile } = fakeRelease(t);
  serve(t, {
    'bmair-9.9.9-web-release.zip': zip,
    SHA256SUMS: `${'0'.repeat(64)}  bmair-9.9.9-web-release.zip\n`,
  });

  await assert.rejects(updateBot('9.9.9', { directory, lockFile }), /SHA256SUMS lists 0{64}/);
  assert.deepEqual(Object.keys(fileHashes(directory)), ['old.html']);
  assert.equal(existsSync(lockFile), false);
});
