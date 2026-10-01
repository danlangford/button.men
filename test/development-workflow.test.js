import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { read } from './helpers.js';

test('development-workflow: Pull request checks - lint and tests run and are required before merge', () => {
  const workflow = read('.github/workflows/ci.yml');
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /npm run lint/);
  assert.match(workflow, /npm test/);
});

test('development-workflow: Dependency updates - npm and GitHub Actions have automated update proposals', () => {
  const config = read('.github/dependabot.yml');
  assert.match(config, /package-ecosystem: npm/);
  assert.match(config, /package-ecosystem: github-actions/);
});

test('development-workflow: Critical journeys - a browser test suite runs in CI alongside unit tests', () => {
  const workflow = read('.github/workflows/ci.yml');
  assert.match(workflow, /npm run test:browser/);
  assert.ok(existsSync(fileURLToPath(new URL('../playwright.config.js', import.meta.url))));
  assert.ok(existsSync(fileURLToPath(new URL('../test/browser/smoke.spec.js', import.meta.url))));
});
