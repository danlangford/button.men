import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
import { read, wranglerConfig } from './helpers.js';

// Anything outside the free plan could bill. A free account has no card on file,
// so past the daily limit requests fail instead of charging.
const PAID_OR_STATEFUL = ['durable_objects', 'kv_namespaces', 'd1_databases', 'r2_buckets', 'queues', 'limits', 'usage_model', 'placement', 'analytics_engine_datasets'];

test('hosting: Normal month - config uses only free-plan features', () => {
  const config = wranglerConfig();
  for (const key of PAID_OR_STATEFUL) assert.equal(config[key], undefined, key);
});

test('hosting: Free limits reached - nothing configured that could incur charges', () => {
  const config = wranglerConfig();
  assert.deepEqual(Object.keys(config).sort(), ['assets', 'compatibility_date', 'main', 'name', 'routes', 'workers_dev']);
});

test('hosting: Plain HTTP - redirects to https', async () => {
  const response = await worker.fetch(new Request('http://button.men/some/page?x=1'), {});
  assert.equal(response.status, 301);
  assert.equal(response.headers.get('Location'), 'https://button.men/some/page?x=1');
});

test('hosting: local development (wrangler dev) is not redirected', async () => {
  const env = { LOCAL_DEV: 'true', ASSETS: { fetch: async () => new Response('page') } };
  const response = await worker.fetch(new Request('http://button.men/'), env);
  assert.equal(await response.text(), 'page');
});

test('hosting: served at button.men', () => {
  const config = wranglerConfig();
  assert.deepEqual(config.routes, [{ pattern: 'button.men', custom_domain: true }]);
  assert.equal(config.assets.run_worker_first, true);
});

test('hosting: Deploying - deploys automatically once CI succeeds on main', () => {
  const workflow = read('.github/workflows/deploy.yml');
  assert.match(workflow, /workflow_run:\s*\n\s*workflows: \[CI\]/);
  assert.match(workflow, /branches: \[main\]/);
  assert.match(workflow, /if: github\.event\.workflow_run\.conclusion == 'success'/);
  assert.match(workflow, /npm run deploy/);
});

test('hosting: Deployment verification - checks the public site and reports failure', () => {
  const workflow = read('.github/workflows/deploy.yml');
  assert.match(workflow, /Verify the deployed site responds/);
  assert.match(workflow, /curl .*https:\/\/button\.men\//);
  assert.match(workflow, /::error::/);
});
