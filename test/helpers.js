import { readFileSync } from 'node:fs';

export const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

// wrangler.jsonc only uses whole-line comments.
export const wranglerConfig = () =>
  JSON.parse(read('wrangler.jsonc').split('\n').filter((line) => !/^\s*\/\//.test(line)).join('\n'));
