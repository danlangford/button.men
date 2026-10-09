import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const lock = JSON.parse(readFileSync(new URL('../../bot.lock.json', import.meta.url), 'utf8'));
const version = lock.release.replace(/^bmair-v/, '');
// The only requests /bot may make: its own page and the files of its release.
const releasePaths = new Set(['/bot/', ...Object.keys(lock.files).map((file) => `/bot/${file}`)]);

test('the Button Men AI answers a position in the browser without sending it anywhere', async ({ page, baseURL }) => {
  const requests = [];
  page.context().on('request', (request) => {
    if (!request.url().startsWith('data:')) requests.push(request);
  });

  await page.goto('/bot');
  await expect(page).toHaveURL(/\/bot\/$/);
  await expect(page.locator('#version')).toHaveText(version);
  await expect(page.locator('#input')).toHaveValue(/getaction/);

  await page.getByRole('button', { name: 'Run' }).click();
  await expect(page.getByRole('status')).toContainText('Finished');
  await expect(page.locator('#output')).toContainText('\naction\n');

  const paths = requests.map((request) => new URL(request.url()).pathname);
  expect(paths.some((path) => path.endsWith('/bmair.wasm')), 'the engine was loaded').toBe(true);
  for (const request of requests.filter((request) => new URL(request.url()).pathname !== '/bot')) {
    const url = new URL(request.url());
    expect(url.origin, request.url()).toBe(new URL(baseURL).origin);
    expect(request.method(), request.url()).toBe('GET');
    expect(url.search, request.url()).toBe('');
    expect(releasePaths.has(url.pathname), request.url()).toBe(true);
  }
});

test('the AI page cannot reach the player\'s session or any other site', async ({ page }) => {
  await page.goto('/bot/');
  await expect(page.locator('#version')).toHaveText(version);
  const attempts = await page.evaluate(async () => {
    const { document } = globalThis;
    const attempt = (url, init) => fetch(url, init).then(() => 'sent', () => 'blocked');
    return {
      api: await attempt('/api/responder', { method: 'POST', body: '{"type":"loadPlayerName"}' }),
      app: await attempt('/'),
      elsewhere: await attempt('https://example.com/'),
      frame: await new Promise((resolve) => {
        const frame = document.createElement('iframe');
        frame.src = '/';
        frame.onload = () => resolve(frame.contentDocument ? 'scriptable' : 'blocked');
        document.body.append(frame);
        setTimeout(() => resolve('blocked'), 1000);
      }),
    };
  });
  expect(attempts).toEqual({ api: 'blocked', app: 'blocked', elsewhere: 'blocked', frame: 'blocked' });
});

test('the site navigation leads to the Button Men AI before anyone logs in', async ({ page }) => {
  await page.goto('/');
  const link = page.getByRole('navigation').getByRole('link', { name: 'Bot' });
  await expect(link).toBeVisible();
  await link.click();
  await expect(page).toHaveURL(/\/bot\/$/);
  await expect(page.locator('#version')).toHaveText(version);
});
