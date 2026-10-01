import { defineConfig, devices } from '@playwright/test';

// A small, deterministic browser suite for critical user journeys, run
// against the fixture-server.js static+stub server (never buttonweavers.com
// or a real account). Keep the fast Node unit tests as the primary coverage;
// this suite only exercises what actually needs a real browser.
export default defineConfig({
  testDir: './test/browser',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run build && node test/browser/fixture-server.js',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
