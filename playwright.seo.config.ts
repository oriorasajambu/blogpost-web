import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './test/integration',
  testMatch: 'seo-environments.spec.ts',
  workers: 1,
  fullyParallel: false,
  timeout: 30_000,
  retries: 0,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:3102' },
  webServer: {
    command: 'node test/integration/seo-environments.mjs',
    url: 'http://127.0.0.1:3105/ready',
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
