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
]);
const action = process.argv[2] ?? 'status';
if (controls.has(action)) {
  const context = JSON.parse(readFileSync('.local/live-editor/context.json', 'utf8'));
  if (context.state !== 'ready' || !/^blogpost-web-editor-[a-f0-9]{12}$/.test(context.name))
    throw new Error('A ready, owned editor backend is required.');
  const run = (args) =>
    execFileSync('docker', args, {
      encoding: 'utf8',
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 60_000,
      maxBuffer: 4 * 1024 * 1024,
    });
  if (run(['inspect', '--format', '{{.State.Running}}', `${context.name}-api`]).trim() !== 'true')
    throw new Error('The owned editor API is not running.');
  run([
    'cp',
    resolve('test/integration/editor-fixture.mjs'),
    `${context.name}-api:/app/test/web-editor-control-fixture.mjs`,
  ]);
  process.stdout.write(
    run([
      'exec',
      `${context.name}-api`,
      'node',
      '--import',
      'tsx',
      'test/web-editor-control-fixture.mjs',
      ...process.argv.slice(2),
    ]),
  );
} else {
  process.env.LIVE_TEST_SUITE = 'editor';
  await import('./live-backend.mjs');
}
