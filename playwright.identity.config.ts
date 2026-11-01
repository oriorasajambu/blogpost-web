import { readFileSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';
const context = JSON.parse(readFileSync('.local/live-identity/context.json', 'utf8'));
if (context.state !== 'ready')
  throw new Error('Start the isolated identity backend before running this suite.');
export default defineConfig({
  testDir: './test/integration',
  testMatch: 'identity-session.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  outputDir: '.local/identity-test-results',
  reporter: 'list',
  use: {
    channel: 'chromium',
    baseURL: context.webOrigin,
    ...devices['Desktop Chrome'],
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    launchOptions: {
      args: ['--no-proxy-server', '--host-resolver-rules=MAP identity-web.blogpost.test 127.0.0.1'],
    },
  },
  webServer: {
    command: 'node test/integration/identity-web.mjs',
    url: `${context.webOrigin}/health/live`,
    reuseExistingServer: false,
    timeout: 90_000,
  },
});
