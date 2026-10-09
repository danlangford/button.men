// Copies a published BMAIR web release into public/bot unmodified, and
// checks an existing copy against the release it claims to be. CI runs the
// check, so nothing reaches button.men/bot that BMAIR did not publish. See
// openspec/specs/bot/spec.md.
import { isDeepStrictEqual } from 'node:util';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPOSITORY = 'danlangford/bmai';
const RELEASES = `https://github.com/${REPOSITORY}/releases/download`;
const RELEASE_API = `https://api.github.com/repos/${REPOSITORY}/releases/tags`;

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
    apiUrl: `${RELEASE_API}/${release}`,
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

/**
 * The checksum GitHub records for the asset. An immutable release can't have
 * its assets replaced after publication, so this pins what was published.
 */
export function publishedDigest(release, asset) {
  if (release.immutable !== true || release.draft || release.prerelease) {
    throw new Error(`${release.tag_name} is not an immutable, published release`);
  }
  const digest = release.assets?.find((entry) => entry.name === asset)?.digest;
  const match = /^sha256:([0-9a-f]{64})$/.exec(digest ?? '');
  if (!match) throw new Error(`${release.tag_name} has no SHA-256 digest for ${asset}`);
  return match[1];
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

async function download(url, headers = {}) {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

/** Downloads a release's web zip and returns it only if every published checksum agrees. */
async function verifiedRelease(version) {
  const { release, asset, url, sumsUrl, apiUrl } = releaseAsset(version);
  const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  // CI passes its token so shared runner addresses don't hit the anonymous rate limit.
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const digest = publishedDigest(JSON.parse(await download(apiUrl, headers)), asset);
  const listed = listedChecksum((await download(sumsUrl)).toString('utf8'), asset);
  const zip = await download(url);
  const actual = sha256(zip);
  if (actual !== digest || actual !== listed) {
    throw new Error(`${asset} has SHA-256 ${actual}, but GitHub records ${digest} and SHA256SUMS lists ${listed}`);
  }
  return { release, asset, url, zip, sha256: actual };
}

/** Extracts into a fresh temporary directory, which the caller removes. */
function extract(zip, asset) {
  const work = mkdtempSync(join(tmpdir(), 'bmair-web-'));
  try {
    const archive = join(work, asset);
    const site = join(work, 'site');
    writeFileSync(archive, zip);
    // unzip drops `..` from entry names and fails on absolute ones, so
    // nothing lands outside `site`; any warning counts as a failure here.
    const unzip = spawnSync('unzip', ['-q', archive, '-d', site], { stdio: 'inherit' });
    if (unzip.error) throw new Error(`unzip is needed to extract ${asset}: ${unzip.error.message}`);
    if (unzip.status !== 0) throw new Error(`unzip could not extract ${asset} cleanly`);
    const files = fileHashes(site);
    if (!files['index.html']) throw new Error(`${asset} has no index.html at its root`);
    return { work, site, files };
  } catch (error) {
    rmSync(work, { recursive: true, force: true });
    throw error;
  }
}

export async function updateBot(version, { directory = BOT_DIRECTORY, lockFile = LOCK_FILE } = {}) {
  const { release, asset, url, zip, sha256: checksum } = await verifiedRelease(version);
  const { work, site, files } = extract(zip, asset);
  try {
    rmSync(directory, { recursive: true, force: true });
    cpSync(site, directory, { recursive: true });
    const lock = { release, url, sha256: checksum, files };
    writeFileSync(lockFile, `${JSON.stringify(lock, null, 2)}\n`);
    return lock;
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

/** Re-derives the served files from the published release the lock names. */
export async function verifyBot({ directory = BOT_DIRECTORY, lockFile = LOCK_FILE } = {}) {
  const lock = JSON.parse(readFileSync(lockFile, 'utf8'));
  const version = /^bmair-v(\d+\.\d+\.\d+)$/.exec(lock.release ?? '')?.[1];
  if (!version) throw new Error(`bot.lock.json names no BMAIR release: "${lock.release}"`);
  const { asset, url, zip, sha256: checksum } = await verifiedRelease(version);
  if (lock.url !== url || lock.sha256 !== checksum) {
    throw new Error(`bot.lock.json does not record the published ${asset} (${url}, ${checksum})`);
  }
  const { work, files } = extract(zip, asset);
  try {
    if (!isDeepStrictEqual(lock.files, files)) {
      throw new Error(`bot.lock.json's file list is not the contents of the published ${asset}`);
    }
    if (!isDeepStrictEqual(fileHashes(directory), files)) {
      throw new Error(`public/bot is not the contents of the published ${asset}`);
    }
    return lock;
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const argument = process.argv[2] ?? '';
    if (argument === '--verify') {
      const lock = await verifyBot();
      console.log(`public/bot is exactly the published ${lock.release}: ${Object.keys(lock.files).length} files.`);
    } else {
      const lock = await updateBot(argument);
      console.log(`public/bot now serves ${lock.release}: ${Object.keys(lock.files).length} files.`);
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
