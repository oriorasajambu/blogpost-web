import { readFileSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

const context = JSON.parse(readFileSync('.local/live-editor/context.json', 'utf8'));
if (context.state !== 'ready') throw new Error('Start the isolated editor backend first.');
export default defineConfig({
  testDir: './test/integration',
  testMatch: 'editor.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  outputDir: '.local/editor-test-results',
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    channel: 'chromium',
    baseURL: context.webOrigin,
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    launchOptions: { args: ['--no-proxy-server'] },
  },
  webServer: {
    command: 'node test/integration/editor-web.mjs',
    url: `${context.webOrigin}/health/live`,
    reuseExistingServer: false,
    timeout: 90_000,
  },
});
