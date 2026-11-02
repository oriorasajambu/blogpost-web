import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';

const context = JSON.parse(readFileSync('.local/live-staff/context.json', 'utf8'));
if (context.state !== 'ready') throw new Error('Start the isolated staff backend first.');
const child = spawn(
  process.execPath,
  ['scripts/start.mjs', '--port', String(context.webPort), '--hostname', '127.0.0.1'],
  {
    env: {
      ...process.env,
      APP_ENV: 'development',
      WEB_LOGIN_ENABLED: 'true',
      WEB_ORIGIN: context.webOrigin,
      BACKEND_ORIGIN: context.backendOrigin,
      WEB_CSRF_SECRET: 'synthetic-local-staff-csrf-secret-not-a-deployment-secret',
      IDENTITY_WEB_API_KEY: 'disposable-staff-key',
      IDENTITY_AUTH_DOMAIN: 'localhost',
      IDENTITY_PROJECT_ID: context.identityProjectId,
      IDENTITY_WEB_APP_ID: '1:123456789:web:1234567890abcdef',
      IDENTITY_AUTH_EMULATOR_ORIGIN: context.authOrigin,
      LOCAL_STACK_ID: context.name,
    },
    windowsHide: true,
    stdio: 'inherit',
  },
);
let stopping = false;
const stop = () => {
  if (!stopping) {
    stopping = true;
    child.kill();
  }
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
child.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
