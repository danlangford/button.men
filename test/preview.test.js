import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanupExpiredPreview,
  cleanupPreview,
  findExpiredPreviewNumbers,
  previewApiEndpoint,
  previewDetails,
  previewExpired,
  wranglerConfig,
} from '../scripts/preview.js';
import { read } from './helpers.js';

const realFetch = globalThis.fetch;
const realEnv = { ...process.env };

function response(result, headers = {}) {
  return new Response(JSON.stringify({ success: true, result }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

function githubResponse(result) {
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  process.env.GITHUB_TOKEN = 'test-token';
  process.env.GITHUB_REPOSITORY = 'danlangford/button.men';
  process.env.CLOUDFLARE_API_TOKEN = 'test-cloudflare-token';
  process.env.CLOUDFLARE_ACCOUNT_ID = 'test-account';
  process.env.CLOUDFLARE_ZONE_ID = 'test-zone';
});

afterEach(() => {
  globalThis.fetch = realFetch;
  for (const key of Object.keys(process.env)) {
    if (!(key in realEnv)) delete process.env[key];
  }
  Object.assign(process.env, realEnv);
});

test('preview deployment uses stable PR-specific names, route, assets, and production default', () => {
  assert.deepEqual(previewDetails(21), {
    number: 21,
    worker: 'button-men-pr-21',
    route: 'pr21.button.men/*',
    url: 'https://pr21.button.men',
    environment: 'preview-pr-21',
  });
  assert.equal(previewApiEndpoint(21), undefined);
  assert.deepEqual(wranglerConfig({ prNumber: 21, sourceDir: '/tmp/pr-source' }), {
    name: 'button-men-pr-21',
    main: '/tmp/pr-source/src/worker.js',
    compatibility_date: '2026-05-01',
    workers_dev: false,
    assets: {
      directory: '/tmp/pr-source/public',
      binding: 'ASSETS',
      run_worker_first: true,
    },
    routes: [{ pattern: 'pr21.button.men/*', zone_name: 'button.men' }],
  });
});

test('preview API endpoint mappings are isolated per PR and require HTTPS responder URLs', () => {
  const targets = JSON.stringify({
    21: 'https://staging.buttonweavers.example/api/responder',
    22: 'https://test.buttonweavers.example/api/responder',
  });
  assert.equal(previewApiEndpoint(21, targets), 'https://staging.buttonweavers.example/api/responder');
  assert.equal(previewApiEndpoint(22, targets), 'https://test.buttonweavers.example/api/responder');
  assert.equal(previewApiEndpoint(23, targets), undefined);
  assert.throws(() => previewApiEndpoint(21, '{"21":"http://staging.example/api/responder"}'), /HTTPS/);
  assert.throws(() => previewApiEndpoint(21, '{"21":"ftp://staging.example/api/responder"}'), /HTTPS/);
  assert.throws(() => previewDetails('21;rm -rf'), /Invalid pull request number/);
});

test('preview expires at 14 days, not before, and inactive deployments stay inactive', () => {
  const now = Date.parse('2026-09-30T00:00:00Z');
  assert.equal(previewExpired({ created_at: '2026-09-17T00:00:00Z' }, { state: 'success' }, now), false);
  assert.equal(previewExpired({ created_at: '2026-09-16T00:00:00Z' }, { state: 'success' }, now), true);
  assert.equal(previewExpired({ created_at: '2026-09-01T00:00:00Z' }, { state: 'inactive' }, now), false);
});

test('a later commit creates a fresh deployment at the same preview address', () => {
  const now = Date.parse('2026-09-30T00:00:00Z');
  const details = previewDetails(21);
  const newDeployment = { created_at: '2026-09-29T23:00:00Z' };
  assert.equal(previewExpired(newDeployment, { state: 'success' }, now), false);
  assert.equal(details.url, 'https://pr21.button.men');
  assert.equal(wranglerConfig({ prNumber: 21, sourceDir: '/tmp/pr-source' }).routes[0].pattern, details.route);
});

test('scheduled cleanup selects stale active previews but not fresh or already inactive ones', async () => {
  globalThis.fetch = async (url) => {
    const parsed = new URL(url);
    if (parsed.pathname.endsWith('/pulls')) {
      return githubResponse([{ number: 21 }, { number: 22 }, { number: 23 }]);
    }
    if (parsed.pathname.endsWith('/deployments')) {
      const prNumber = Number(parsed.searchParams.get('environment').slice('preview-pr-'.length));
      const createdAt = prNumber === 22 ? '2026-09-25T00:00:00Z' : '2026-09-10T00:00:00Z';
      return githubResponse([{ id: prNumber, created_at: createdAt }]);
    }
    if (parsed.pathname.endsWith('/statuses')) {
      const prNumber = Number(parsed.pathname.split('/').at(-2));
      return githubResponse([{ state: prNumber === 23 ? 'inactive' : 'success' }]);
    }
    throw new Error(`Unexpected request: ${url}`);
  };
  assert.deepEqual(await findExpiredPreviewNumbers(Date.parse('2026-09-30T00:00:00Z')), [21]);
});

test('scheduled cleanup rechecks deployment freshness before removing a preview', async () => {
  globalThis.fetch = async (url) => {
    const parsed = new URL(url);
    if (parsed.pathname.endsWith('/deployments')) {
      return githubResponse([{ id: 123, created_at: '2026-09-29T00:00:00Z' }]);
    }
    if (parsed.pathname.endsWith('/statuses')) return githubResponse([{ state: 'success' }]);
    throw new Error(`Unexpected cleanup request: ${url}`);
  };
  assert.equal(await cleanupExpiredPreview(21, Date.parse('2026-09-30T00:00:00Z')), false);
});

test('cleanup removes only the matching preview route and worker', async () => {
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    const parsed = new URL(url);
    calls.push({ url: parsed, method: init.method || 'GET' });
    if (parsed.pathname.endsWith('/workers/routes') && !init.method) {
      return response([
        { id: 'owned-route', pattern: 'pr21.button.men/*', script: 'button-men-pr-21' },
        { id: 'other-route', pattern: 'pr22.button.men/*', script: 'button-men-pr-22' },
      ]);
    }
    if (parsed.pathname.endsWith('/owned-route')) return response({ id: 'owned-route' });
    if (parsed.pathname.endsWith('/workers/scripts/button-men-pr-21')) return response({ id: 'button-men-pr-21' });
    if (parsed.pathname.endsWith('/deployments')) return githubResponse([{ id: 42 }]);
    if (parsed.pathname.endsWith('/statuses') && init.method === 'POST') {
      assert.equal(JSON.parse(init.body).state, 'inactive');
      return githubResponse({ id: 43 });
    }
    if (parsed.pathname.endsWith('/statuses')) return githubResponse([{ state: 'success' }]);
    throw new Error(`Unexpected request: ${url}`);
  };
  await cleanupPreview(21);
  assert.ok(calls.some(({ url, method }) => method === 'DELETE' && url.pathname.endsWith('/owned-route')));
  assert.ok(calls.some(({ url, method }) => method === 'DELETE' && url.pathname.endsWith('/workers/scripts/button-men-pr-21')));
  assert.ok(!calls.some(({ url }) => url.pathname.endsWith('/other-route')));
});

test('preview workflow uses pull_request_target and does not run PR scripts or Wrangler config', () => {
  const workflow = read('.github/workflows/preview.yml');
  assert.match(workflow, /pull_request_target:/);
  assert.match(workflow, /types: \[opened, reopened, synchronize, closed\]/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /^\s+pull_request:/m);
  assert.match(workflow, /path: pr-source/);
  assert.match(workflow, /ref: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/);
  assert.doesNotMatch(workflow, /npm (?:ci|install|run)|wrangler\.jsonc/);
  const checkoutSteps = workflow.slice(workflow.indexOf('path: pr-source'), workflow.indexOf('run: node scripts/preview.js deploy'));
  assert.doesNotMatch(checkoutSteps, /secrets\.CLOUDFLARE_API_TOKEN/);
  assert.match(workflow, /CLOUDFLARE_API_TOKEN: \$\{\{ secrets\.CLOUDFLARE_API_TOKEN \}\}/);
  assert.match(read('scripts/preview.js'), /routes: \[\{ pattern: preview\.route, zone_name: PREVIEW_DOMAIN \}\]/);
});
