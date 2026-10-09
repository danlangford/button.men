// Copies a published BMAIR web release into public/bot unmodified, and
// records what it copied in bot.lock.json so the tests can prove the served
// files are exactly that release. See openspec/specs/bot/spec.md.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RELEASES = 'https://github.com/danlangford/bmai/releases/download';

export const BOT_DIRECTORY = resolve(root, 'public/bot');
export const LOCK_FILE = resolve(root, 'bot.lock.json');

export function releaseAsset(version) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(`Expected a BMAIR release version such as 0.28.0, not "${version}"`);
  }
  const release = `bmair-v${version}`;
  const asset = `bmair-${version}-web-release.zip`;
  return {
    release,
    asset,
    url: `${RELEASES}/${release}/${asset}`,
    sumsUrl: `${RELEASES}/${release}/SHA256SUMS`,
  };
}

/** The checksum a release's SHA256SUMS lists for one of its assets. */
export function listedChecksum(sums, asset) {
  for (const line of sums.split('\n')) {
    const match = /^([0-9a-f]{64}) [ *](.+)$/.exec(line.trim());
    if (match && match[2] === asset) return match[1];
  }
  throw new Error(`SHA256SUMS does not list ${asset}`);
}

export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

/** Every file under `directory`, keyed by its `/`-separated path, with its SHA-256. */
export function fileHashes(directory) {
  const walk = (path) => readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = join(path, entry.name);
    if (entry.isDirectory()) return walk(child);
    if (!entry.isFile()) throw new Error(`Not a plain file: ${relative(directory, child)}`);
    return [child];
  });
  return Object.fromEntries(
    walk(directory)
      .map((path) => [relative(directory, path).split(sep).join('/'), sha256(readFileSync(path))])
      .sort(([a], [b]) => (a < b ? -1 : 1)),
  );
}

async function download(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

export async function updateBot(version, { directory = BOT_DIRECTORY, lockFile = LOCK_FILE } = {}) {
  const { release, asset, url, sumsUrl } = releaseAsset(version);
  const zip = await download(url);
  const expected = listedChecksum((await download(sumsUrl)).toString('utf8'), asset);
  const actual = sha256(zip);
  if (actual !== expected) {
    throw new Error(`${asset} has SHA-256 ${actual}, but the release's SHA256SUMS lists ${expected}`);
  }

  const work = mkdtempSync(join(tmpdir(), 'bmair-web-'));
  try {
    const archive = join(work, asset);
    const site = join(work, 'site');
    writeFileSync(archive, zip);
    // unzip drops `..` and leading `/` from entry names, so nothing lands outside `site`.
    const unzip = spawnSync('unzip', ['-q', archive, '-d', site], { stdio: 'inherit' });
    if (unzip.error || unzip.status !== 0) throw new Error(`unzip could not extract ${asset}`);
    const files = fileHashes(site);
    if (!files['index.html']) throw new Error(`${asset} has no index.html at its root`);

    rmSync(directory, { recursive: true, force: true });
    cpSync(site, directory, { recursive: true });
    const lock = { release, url, sha256: actual, files };
    writeFileSync(lockFile, `${JSON.stringify(lock, null, 2)}\n`);
    return lock;
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const lock = await updateBot(process.argv[2] ?? '');
    console.log(`public/bot now serves ${lock.release}: ${Object.keys(lock.files).length} files.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
