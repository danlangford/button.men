import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const lock = JSON.parse(readFileSync(new URL('../../bot.lock.json', import.meta.url), 'utf8'));
const version = lock.release.replace(/^bmair-v/, '');

test('the Button Men AI answers a position in the browser without sending it anywhere', async ({ page, baseURL }) => {
  const requests = [];
  page.context().on('request', (request) => requests.push(request));

  await page.goto('/bot/');
  await expect(page.locator('#version')).toHaveText(version);
  await expect(page.locator('#input')).toHaveValue(/getaction/);

  await page.getByRole('button', { name: 'Run' }).click();
  await expect(page.getByRole('status')).toContainText('Finished');
  await expect(page.locator('#output')).toContainText('\naction\n');

  const urls = requests.map((request) => request.url());
  expect(urls.some((url) => url.endsWith('/bmair.wasm'))).toBe(true);
  for (const request of requests) {
    expect(new URL(request.url()).origin, request.url()).toBe(new URL(baseURL).origin);
    expect(request.method(), request.url()).toBe('GET');
  }
});

test('the site navigation leads to the Button Men AI before anyone logs in', async ({ page }) => {
  await page.goto('/');
  const link = page.getByRole('navigation').getByRole('link', { name: 'Bot' });
  await expect(link).toBeVisible();
  await link.click();
  await expect(page).toHaveURL(/\/bot\/$/);
  await expect(page.locator('#version')).toHaveText(version);
});
