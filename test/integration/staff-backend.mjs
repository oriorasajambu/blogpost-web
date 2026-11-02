import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const controls = new Set([
  'prepare',
  'create-post',
  'advance-post',
  'reassign-post',
  'post-state',
  'expire-media',
  'expire-replay',
  'post-count',
  'staff-capacity',
  'staff-list-seed',
  'staff-list-cleanup',
]);
const action = process.argv[2] ?? 'status';
if (controls.has(action)) {
  const context = JSON.parse(readFileSync('.local/live-staff/context.json', 'utf8'));
  if (context.state !== 'ready' || !/^blogpost-web-staff-[a-f0-9]{12}$/.test(context.name))
    throw new Error('A ready owned staff backend is required.');
  const run = (args) =>
    execFileSync('docker', args, {
      encoding: 'utf8',
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 60_000,
      maxBuffer: 4 * 1024 * 1024,
    });
  if (run(['inspect', '--format', '{{.State.Running}}', `${context.name}-api`]).trim() !== 'true')
    throw new Error('The owned staff backend is not running.');
  const fixture =
    action === 'staff-capacity'
      ? 'staff-capacity.mjs'
      : action.startsWith('staff-list-')
        ? 'staff-invitation-fixture.mjs'
        : 'editor-fixture.mjs';
  run([
    'cp',
    resolve(`test/integration/${fixture}`),
    `${context.name}-api:/app/test/web-staff-control.mjs`,
  ]);
  process.stdout.write(
    run([
      'exec',
      `${context.name}-api`,
      'node',
      '--import',
      'tsx',
      'test/web-staff-control.mjs',
      ...process.argv.slice(2),
    ]),
  );
} else {
  process.env.LIVE_TEST_SUITE = 'staff';
  await import('./live-backend.mjs');
}
