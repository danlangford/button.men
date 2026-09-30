import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDirectory = resolve(root, 'openspec/specs');
const outputFile = resolve(root, 'public/specs/specifications.json');

function markdownFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return markdownFiles(path);
    return entry.isFile() && entry.name.endsWith('.md') ? [path] : [];
  });
}

export function buildSpecifications(source = sourceDirectory, output = outputFile) {
  let files;
  try {
    files = markdownFiles(source);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Specification directory not found: ${source}`, { cause: error });
    }
    throw error;
  }

  const features = files.sort().map((path) => {
    const pathFromSource = relative(source, path);
    const parts = pathFromSource.split(sep);
    const name = parts.at(-1) === 'spec.md'
      ? parts.slice(0, -1).join('/')
      : pathFromSource.slice(0, -3).split(sep).join('/');
    return { name, markdown: readFileSync(path, 'utf8') };
  });

  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify({ features }, null, 2)}\n`);
  return features;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [source, output] = process.argv.slice(2);
  buildSpecifications(
    source ? resolve(source) : sourceDirectory,
    output ? resolve(output) : outputFile,
  );
}
