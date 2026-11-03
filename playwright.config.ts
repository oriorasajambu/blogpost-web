import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './test/e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  webServer: [
    {
      command: 'node test/e2e/fixture-server.mjs',
      url: 'http://127.0.0.1:4110/__test/health',
      reuseExistingServer: false,
      timeout: 15_000,
    },
    {
      command: 'npm run start -- --port 3100 --hostname 127.0.0.1',
      url: 'http://localhost:3100/health/live',
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        APP_ENV: 'development',
        BACKEND_ORIGIN: 'http://127.0.0.1:4110',
        WEB_ORIGIN: 'http://localhost:3100',
        WEB_LOGIN_ENABLED: 'false',
        LOCAL_STACK_ID: 'e2e-reading',
      },
    },
  ],
});
