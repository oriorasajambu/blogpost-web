import { execFileSync } from 'node:child_process';
import { cp } from 'node:fs/promises';
execFileSync(process.execPath, ['node_modules/next/dist/bin/next', 'build'], {
  stdio: 'inherit',
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
});
// Next intentionally leaves public/static assets to the host; include them for local standalone runs too.
await cp('public', '.next/standalone/public', { recursive: true });
await cp('.next/static', '.next/standalone/.next/static', { recursive: true });
