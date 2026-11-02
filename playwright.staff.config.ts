import { readFileSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';
const context = JSON.parse(readFileSync('.local/live-staff/context.json', 'utf8'));
if (context.state !== 'ready') throw new Error('Start the isolated staff backend first.');
export default defineConfig({
  testDir: './test/integration',
  testMatch: 'staff-*.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  outputDir: '.local/staff-test-results',
  reporter: [['list'], ['./test/integration/staff-reporter.mjs']],
  use: {
    ...devices['Desktop Chrome'],
    channel: 'chromium',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    baseURL: context.webOrigin,
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    launchOptions: { args: ['--no-proxy-server'] },
  },
  webServer: {
    command: 'node test/integration/staff-web.mjs',
    url: `${context.webOrigin}/health/live`,
    reuseExistingServer: false,
    timeout: 90_000,
  },
});
