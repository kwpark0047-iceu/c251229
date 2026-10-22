import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'isolated-smoke.spec.ts',
  workers: 1,
  forbidOnly: true,
  retries: 0,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:3117', serviceWorkers: 'block' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node scripts/run-isolated-smoke.mjs',
    url: 'http://127.0.0.1:3117',
    reuseExistingServer: false,
    timeout: 180000,
  },
});
