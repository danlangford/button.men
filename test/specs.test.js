import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildSpecs, collectSpecs } from '../scripts/build-specs.js';

test('specs: Static asset - includes all feature specs in name order', async () => {
  const specs = await collectSpecs();
  assert.deepEqual(specs.map(({ name }) => name), [
    'api-proxy',
    'development-workflow',
    'forum',
    'hosting',
    'web-ui',
  ]);
  assert.match(specs[0].content, /Credentials are never kept/);

  const outputDir = await mkdtemp(path.join(os.tmpdir(), 'button-men-specs-'));
  try {
    const outputFile = path.join(outputDir, 'specs.json');
    await buildSpecs(undefined, outputFile);
    assert.deepEqual(JSON.parse(await readFile(outputFile, 'utf8')), specs);
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});
