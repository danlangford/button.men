import { expect, test } from '@playwright/test';

test('an anonymous visitor can browse specifications with the shared site shell', async ({ page }) => {
  await page.goto('/specs/');

  await expect(page.getByRole('heading', { name: 'Current specifications' })).toBeVisible();

  // Shared navigation: the same links as the main site, reachable without logging in.
  const nav = page.getByRole('navigation');
  await expect(nav.getByRole('link', { name: 'Games' })).toHaveAttribute('href', '/#games');
  await expect(nav.getByRole('link', { name: 'Forum' })).toHaveAttribute('href', '/#!');
  await expect(nav.getByRole('link', { name: 'Search' })).toHaveAttribute('href', '/#search');

  // Capabilities are listed (not "features"), and are readable without an account.
  await expect(page.getByRole('heading', { name: 'Capabilities' })).toBeVisible();

  // Shared theme control: choosing dark applies immediately and consistently.
  const theme = page.locator('#theme');
  await theme.selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-bs-theme', 'dark');
});

test('a failed login shows a clear, retryable error instead of silently failing', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('Username').fill('dan');
  await page.getByLabel('Password').fill('wrong-password');
  await page.getByRole('button', { name: 'Log in' }).click();

  await expect(page.getByRole('alert')).toContainText('do not match');

  // The player can retry immediately; the form is still usable.
  await expect(page.getByRole('button', { name: 'Log in' })).toBeEnabled();
});
