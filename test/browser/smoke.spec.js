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

test('the signed-in profile shows preferences and recent games without mobile overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/responder', async (route) => {
    const args = JSON.parse(route.request().postData());
    const replies = {
      loadPlayerName: { status: 'ok', data: { userName: 'alice' } },
      loadProfileInfo: {
        status: 'ok',
        data: { profile_info: { name_ingame: 'alice', name_irl: 'Alice', email: null, n_games_won: 3, n_games_lost: 1 } },
      },
      searchGameHistory: {
        status: 'ok',
        data: { games: [{ gameId: 22, playerNameA: 'alice', playerNameB: 'bob', status: 'COMPLETE', lastMove: 1760000000 }] },
      },
      loadPlayerInfo: {
        status: 'ok',
        data: {
          user_prefs: {
            email: 'alice@example.test',
            name_irl: 'Alice',
            is_email_public: false,
            dob_month: 0,
            dob_day: 0,
            pronouns: '',
            uses_gravatar: false,
            image_size: null,
            favorite_button: null,
            favorite_buttonset: null,
            homepage: '',
            comment: '',
            vacation_message: '',
            autoaccept: false,
            autopass: false,
            fire_overshooting: false,
            monitor_redirects_to_game: false,
            monitor_redirects_to_forum: false,
            automatically_monitor: false,
            player_color: '#dd99dd',
            opponent_color: '#ddffdd',
            neutral_color_a: '#cccccc',
            neutral_color_b: '#dddddd',
            die_background: 'circle',
          },
        },
      },
    };
    await route.fulfill({ json: replies[args.type] || { status: 'failed', message: 'Unexpected API request.' } });
  });
  await page.goto('/#profile');

  await expect(page.getByRole('heading', { name: 'alice' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Preferences' })).toBeVisible();
  await expect(page.getByLabel('Current email address')).toHaveValue('alice@example.test');
  await expect(page.getByRole('link', { name: 'Game 22' })).toHaveAttribute('href', '#game?gameId=22');
  await expect(page.getByRole('link', { name: 'bob' })).toHaveAttribute('href', '#profile?player=bob');
  const overflow = await page.locator('main').evaluate((main) => main.scrollWidth > main.clientWidth);
  expect(overflow).toBe(false);
});
