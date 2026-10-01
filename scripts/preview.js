import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { appendFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const PREVIEW_DOMAIN = 'button.men';
const COMPATIBILITY_DATE = '2026-05-01';
const RETENTION_MS = 14 * 24 * 60 * 60 * 1000;
const CLOUDFLARE_API = 'https://api.cloudflare.com/client/v4';

function parsePullNumber(value) {
  const text = String(value);
  if (!/^[1-9]\d*$/.test(text)) throw new Error('Invalid pull request number');
  const number = Number(text);
  if (!Number.isSafeInteger(number)) throw new Error('Invalid pull request number');
  return number;
}

export function previewDetails(value) {
  const number = parsePullNumber(value);
  return {
    number,
    worker: `button-men-pr-${number}`,
    route: `pr${number}.${PREVIEW_DOMAIN}/*`,
    url: `https://pr${number}.${PREVIEW_DOMAIN}`,
    environment: `preview-pr-${number}`,
  };
}

export function previewApiEndpoint(prNumber, rawTargets = '') {
  const targets = typeof rawTargets === 'string' && rawTargets.trim()
    ? JSON.parse(rawTargets)
    : rawTargets || {};
  if (!targets || typeof targets !== 'object' || Array.isArray(targets)) {
    throw new Error('PREVIEW_API_TARGETS must be a JSON object');
  }
  const endpoint = targets[String(parsePullNumber(prNumber))];
  if (endpoint === undefined) return undefined;
  if (typeof endpoint !== 'string') throw new Error('Preview API targets must be URLs');
  const url = new URL(endpoint);
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/api/responder' || url.search || url.hash) {
    throw new Error('Preview API targets must be HTTPS responder URLs');
  }
  return url.href;
}

export function wranglerConfig({ prNumber, sourceDir, apiTargets = '' }) {
  const preview = previewDetails(prNumber);
  const endpoint = previewApiEndpoint(preview.number, apiTargets);
  return {
    name: preview.worker,
    main: path.resolve(sourceDir, 'src/worker.js'),
    compatibility_date: COMPATIBILITY_DATE,
    workers_dev: false,
    assets: {
      directory: path.resolve(sourceDir, 'public'),
      binding: 'ASSETS',
      run_worker_first: true,
    },
    routes: [{ pattern: preview.route, zone_name: PREVIEW_DOMAIN }],
    ...(endpoint ? { vars: { BUTTONWEAVERS_API_ENDPOINT: endpoint } } : {}),
  };
}

export function previewExpired(deployment, latestStatus, now = Date.now()) {
  if (!deployment || latestStatus?.state === 'inactive') return false;
  const createdAt = Date.parse(deployment.created_at);
  return Number.isFinite(createdAt) && now - createdAt >= RETENTION_MS;
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

async function cloudflareRequest(resource, init = {}, allowNotFound = false) {
  const response = await fetch(`${CLOUDFLARE_API}${resource}`, {
    ...init,
    headers: {
      Authorization: 'Bearer ' + requiredEnv('CLOUDFLARE_API_TOKEN'),
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
  let result;
  try {
    result = await response.json();
  } catch {
    result = null;
  }
  if (allowNotFound && response.status === 404) return null;
  if (!response.ok || result?.success === false) {
    throw new Error(`Cloudflare API request failed (${response.status})`);
  }
  return result?.result;
}

function repositoryPath(pathname) {
  const repository = requiredEnv('GITHUB_REPOSITORY');
  if (!/^[^/]+\/[^/]+$/.test(repository)) throw new Error('Invalid GitHub repository context');
  return `/repos/${repository}${pathname}`;
}

async function githubRequest(pathname, init = {}) {
  const apiUrl = process.env.GITHUB_API_URL || 'https://api.github.com';
  const url = pathname.startsWith('https://') ? pathname : `${apiUrl}${pathname}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: 'Bearer ' + requiredEnv('GITHUB_TOKEN'),
      'X-GitHub-Api-Version': '2022-11-28',
      ...init.headers,
    },
  });
  let result;
  try {
    result = await response.json();
  } catch {
    result = null;
  }
  if (!response.ok) throw new Error(`GitHub API request failed (${response.status})`);
  return { result, headers: response.headers };
}

async function listRoutes(zoneId) {
  const routes = [];
  let page = 1;
  while (true) {
    const response = await cloudflareRequest(
      `/zones/${encodeURIComponent(zoneId)}/workers/routes?page=${page}&per_page=100`,
    );
    routes.push(...(response || []));
    if (!response?.length || response.length < 100) break;
    page += 1;
    if (page > 100) throw new Error('Too many Cloudflare routes to inspect safely');
  }
  return routes;
}

async function assertRouteAvailable(preview) {
  const routes = await listRoutes(requiredEnv('CLOUDFLARE_ZONE_ID'));
  if (routes.some((route) => route.pattern === preview.route && route.script && route.script !== preview.worker)) {
    throw new Error(`Preview route is already assigned to another Worker: ${preview.route}`);
  }
}

async function setDeploymentStatus(deploymentId, state, description, environmentUrl) {
  const body = { state, description, auto_inactive: false };
  if (environmentUrl) body.environment_url = environmentUrl;
  await githubRequest(
    repositoryPath(`/deployments/${deploymentId}/statuses`),
    { method: 'POST', body: JSON.stringify(body) },
  );
}

async function createDeployment(preview, sha) {
  const { result } = await githubRequest(repositoryPath('/deployments'), {
    method: 'POST',
    body: JSON.stringify({
      ref: sha,
      environment: preview.environment,
      description: `Preview for PR #${preview.number}`,
      auto_merge: false,
      required_contexts: [],
      transient_environment: true,
      production_environment: false,
    }),
  });
  if (!result?.id) throw new Error('GitHub did not create a preview deployment');
  return result;
}

function runWrangler(configPath) {
  return new Promise((resolve, reject) => {
    const wrangler = path.join(process.cwd(), 'node_modules', '.bin', 'wrangler');
    const child = spawn(wrangler, ['deploy', '--config', configPath], {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Wrangler deploy failed (${code})`));
    });
  });
}

export async function deployPreview({ prNumber, sha, sourceDir, apiTargets = '' }) {
  const preview = previewDetails(prNumber);
  if (!/^[a-f\d]{40,64}$/i.test(sha)) throw new Error('Invalid pull request commit');
  await assertRouteAvailable(preview);
  const config = wranglerConfig({ prNumber, sourceDir, apiTargets });
  const deployment = await createDeployment(preview, sha);
  let directory;
  try {
    directory = await mkdtemp(path.join(tmpdir(), 'button-men-preview-'));
    const configPath = path.join(directory, `${randomUUID()}.jsonc`);
    await writeFile(configPath, JSON.stringify(config));
    await runWrangler(configPath);
    await setDeploymentStatus(deployment.id, 'success', 'Preview deployed', preview.url);
  } catch (error) {
    await setDeploymentStatus(deployment.id, 'failure', 'Preview deployment failed');
    throw error;
  } finally {
    if (directory) await rm(directory, { recursive: true, force: true });
  }
}

async function latestDeployment(prNumber) {
  const preview = previewDetails(prNumber);
  const { result: deployments } = await githubRequest(
    repositoryPath(`/deployments?environment=${encodeURIComponent(preview.environment)}&per_page=1`),
  );
  const deployment = deployments?.[0];
  if (!deployment) return undefined;
  const { result: statuses } = await githubRequest(
    repositoryPath(`/deployments/${deployment.id}/statuses?per_page=1`),
  );
  return { deployment, status: statuses?.[0] };
}

async function removePreview(prNumber) {
  const preview = previewDetails(prNumber);
  const zoneId = requiredEnv('CLOUDFLARE_ZONE_ID');
  const routes = await listRoutes(zoneId);
  const ownedRoutes = routes.filter(
    (route) => route.pattern === preview.route && (!route.script || route.script === preview.worker),
  );
  for (const route of ownedRoutes) {
    await cloudflareRequest(
      `/zones/${encodeURIComponent(zoneId)}/workers/routes/${encodeURIComponent(route.id)}`,
      { method: 'DELETE' },
      true,
    );
  }
  const accountId = requiredEnv('CLOUDFLARE_ACCOUNT_ID');
  await cloudflareRequest(
    `/accounts/${encodeURIComponent(accountId)}/workers/scripts/${encodeURIComponent(preview.worker)}`,
    { method: 'DELETE' },
    true,
  );
}

export async function cleanupPreview(prNumber) {
  await removePreview(prNumber);
  const latest = await latestDeployment(prNumber);
  if (latest && latest.status?.state !== 'inactive') {
    await setDeploymentStatus(latest.deployment.id, 'inactive', 'Preview removed');
  }
}

export async function cleanupExpiredPreview(prNumber, now = Date.now()) {
  const latest = await latestDeployment(prNumber);
  if (!previewExpired(latest?.deployment, latest?.status, now)) return false;
  await removePreview(prNumber);
  await setDeploymentStatus(latest.deployment.id, 'inactive', 'Preview expired after 14 days without commits');
  return true;
}

async function listOpenPullRequests() {
  const pullRequests = [];
  let pathname = repositoryPath('/pulls?state=open&per_page=100');
  while (pathname) {
    const { result, headers } = await githubRequest(pathname);
    pullRequests.push(...result);
    const next = headers.get('link')?.split(',').find((part) => part.includes('rel="next"'));
    pathname = next?.match(/<([^>]+)>/)?.[1] || '';
  }
  return pullRequests;
}

export async function findExpiredPreviewNumbers(now = Date.now()) {
  const expired = [];
  for (const pullRequest of await listOpenPullRequests()) {
    const latest = await latestDeployment(pullRequest.number);
    if (previewExpired(latest?.deployment, latest?.status, now)) expired.push(pullRequest.number);
  }
  return expired;
}

async function handlePullRequest(event) {
  const pullRequest = event.pull_request;
  const prNumber = parsePullNumber(pullRequest.number);
  if (event.action === 'closed') {
    await cleanupPreview(prNumber);
    return;
  }
  await deployPreview({
    prNumber,
    sha: pullRequest.head.sha,
    sourceDir: path.join(process.cwd(), 'pr-source'),
    apiTargets: process.env.PREVIEW_API_TARGETS || '',
  });
}

export async function run(command, event) {
  if (command === 'deploy') {
    await handlePullRequest(event);
  } else if (command === 'close') {
    await cleanupPreview(event.pull_request.number);
  } else if (command === 'delete') {
    const prNumber = parsePullNumber(process.env.PREVIEW_PULL_NUMBER);
    await cleanupPreview(prNumber);
  } else if (command === 'find-expired') {
    const pullNumbers = await findExpiredPreviewNumbers();
    const matrix = JSON.stringify(pullNumbers.length ? pullNumbers : [0]);
    await appendFile(requiredEnv('GITHUB_OUTPUT'), `pull_numbers=${matrix}\n`);
  } else if (command === 'expire') {
    await cleanupExpiredPreview(process.env.PREVIEW_PULL_NUMBER);
  } else {
    throw new Error('Unsupported preview workflow command');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const eventPath = process.env.GITHUB_EVENT_PATH;
    const event = eventPath ? JSON.parse(await readFile(eventPath, 'utf8')) : {};
    await run(process.argv[2], event);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
