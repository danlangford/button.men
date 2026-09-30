import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildSpecifications } from '../scripts/build-specs.js';

test('specs build: current spec files - preserves feature names and Markdown content', () => {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'specs-build-'));
  const source = join(temporaryDirectory, 'specs');
  const output = join(temporaryDirectory, 'public', 'specifications.json');
  mkdirSync(join(source, 'web-ui'), { recursive: true });
  writeFileSync(join(source, 'web-ui', 'spec.md'), '# Web UI\n\n### Requirement: Browse\n');
  writeFileSync(join(source, 'api-proxy.md'), '# API proxy\n');

  try {
    const features = buildSpecifications(source, output);
    assert.deepEqual(features.map((feature) => feature.name), ['api-proxy', 'web-ui']);
    assert.equal(JSON.parse(readFileSync(output, 'utf8')).features[1].markdown, '# Web UI\n\n### Requirement: Browse\n');
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});

test('specs build: empty source - writes an empty feature list', () => {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'specs-build-'));
  const source = join(temporaryDirectory, 'specs');
  const output = join(temporaryDirectory, 'public', 'specifications.json');
  mkdirSync(source);

  try {
    assert.deepEqual(buildSpecifications(source, output), []);
    assert.deepEqual(JSON.parse(readFileSync(output, 'utf8')), { features: [] });
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});

test('specs build: missing source - reports the missing directory', () => {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'specs-build-'));

  try {
    assert.throws(
      () => buildSpecifications(join(temporaryDirectory, 'missing'), join(temporaryDirectory, 'output.json')),
      /Specification directory not found/,
    );
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});
