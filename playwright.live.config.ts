import { readFileSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';
const context = JSON.parse(readFileSync('.local/live-public/context.json', 'utf8'));
if (context.state !== 'ready')
  throw new Error('Start the disposable live backend before running this suite.');
export default defineConfig({
  testDir: './test/integration',
  testMatch: 'live-public.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 180_000,
  reporter: 'list',
  use: { baseURL: context.webOrigin, ...devices['Desktop Chrome'], trace: 'retain-on-failure' },
  webServer: {
    command: `npm run start -- --port ${context.webPort} --hostname 127.0.0.1`,
    url: `${context.webOrigin}/health/live`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      APP_ENV: 'development',
      BACKEND_ORIGIN: context.backendOrigin,
      WEB_ORIGIN: context.webOrigin,
      WEB_LOGIN_ENABLED: 'false',
      LOCAL_STACK_ID: context.name,
    },
  },
});
