import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
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

test('specs build: CLI accepts a preview source and output path', () => {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'preview-specs-build-'));
  const source = join(temporaryDirectory, 'pr-source', 'openspec', 'specs');
  const output = join(temporaryDirectory, 'pr-source', 'public', 'specs', 'specifications.json');
  mkdirSync(join(source, 'preview-feature'), { recursive: true });
  writeFileSync(join(source, 'preview-feature', 'spec.md'), '# PR version\n');

  try {
    const result = spawnSync(
      process.execPath,
      ['scripts/build-specs.js', source, output],
      { cwd: new URL('..', import.meta.url), encoding: 'utf8' },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(readFileSync(output, 'utf8')), {
      features: [{ name: 'preview-feature', markdown: '# PR version\n' }],
    });
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});
