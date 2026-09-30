import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

export async function collectSpecs(sourceDir = path.join(root, 'openspec/specs')) {
  const features = await readdir(sourceDir, { withFileTypes: true });
  return Promise.all(
    features
      .filter((feature) => feature.isDirectory())
      .map(async ({ name }) => ({
        name,
        content: await readFile(path.join(sourceDir, name, 'spec.md'), 'utf8'),
      })),
  ).then((specs) => specs.sort((a, b) => a.name.localeCompare(b.name)));
}

export async function buildSpecs(
  sourceDir = path.join(root, 'openspec/specs'),
  outputFile = path.join(root, 'public/specs.json'),
) {
  const specs = await collectSpecs(sourceDir);
  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFile(outputFile, `${JSON.stringify(specs)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await buildSpecs();
}
