import { defineConfig, devices } from '@playwright/test';

// Deliberately not 4321. `reuseExistingServer` will happily attach to whatever
// is on the port, and a dev server there would silently test the wrong thing:
// the dev toolbar injects its own <h1>s, ships extra JS, and serves no sitemap.
const PORT = 4399;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',

  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  // Serves the real build output, so the tests check what actually deploys.
  webServer: {
    command: `npx astro preview --port ${PORT} --ignore-lock`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
