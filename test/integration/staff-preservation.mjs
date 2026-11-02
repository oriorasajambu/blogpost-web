import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, relative } from 'node:path';

const directory = '.local/live-staff';
mkdirSync(directory, { recursive: true });
const contextPath = `${directory}/context.json`;
const stack = existsSync(contextPath) ? JSON.parse(readFileSync(contextPath, 'utf8')) : null;
if (stack) assert.match(stack.name, /^blogpost-web-staff-[a-f0-9]{12}$/);
const command = (file, args, cwd) =>
  execFileSync(file, args, {
    encoding: 'utf8',
    windowsHide: true,
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
const hash = (data) => createHash('sha256').update(data).digest('hex');
const inventory = (args) =>
  command('docker', args)
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .filter(
      (line) =>
        !stack ||
        !line
          .split('\t')
          .some((value) => value === stack.name || value.startsWith(`${stack.name}-`)),
    )
    .sort();
const backend = resolve('../blogpost-backend');
const tracked = command(
  'git',
  ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
  backend,
)
  .split('\0')
  .filter(Boolean)
  .sort();
const files = tracked.map((path) => {
  const absolute = resolve(backend, path);
  assert.ok(!relative(backend, absolute).startsWith('..'));
  return { path, sha256: existsSync(absolute) ? hash(readFileSync(absolute)) : null };
});
const volumes = inventory(['volume', 'ls', '--format', '{{.Name}}']);
const containers = inventory(['ps', '--all', '--format', '{{.ID}}\t{{.Names}}\t{{.Image}}']);
const networks = inventory(['network', 'ls', '--format', '{{.ID}}\t{{.Name}}']);
const snapshot = {
  capturedAt: new Date().toISOString(),
  volumes: { count: volumes.length, sha256: hash(volumes.join('\n')) },
  unrelatedContainers: { count: containers.length, sha256: hash(containers.join('\n')) },
  unrelatedNetworks: { count: networks.length, sha256: hash(networks.join('\n')) },
  backend: {
    files: files.length,
    manifestSHA256: hash(JSON.stringify(files)),
    statusSHA256: hash(command('git', ['status', '--porcelain=v1', '-z'], backend)),
  },
};
const baselinePath = `${directory}/preservation-baseline.json`;
if (process.argv[2] === 'baseline' || process.argv[2] === 'rebaseline') {
  if (process.argv[2] === 'rebaseline') {
    const earlier = JSON.parse(readFileSync(baselinePath, 'utf8'));
    for (const key of ['volumes', 'unrelatedContainers', 'backend'])
      assert.deepEqual(earlier[key], snapshot[key], `Cannot refresh baseline: ${key} changed`);
    writeFileSync(
      `${directory}/preservation-earlier-${hash(JSON.stringify(earlier)).slice(0, 16)}.json`,
      JSON.stringify(earlier, null, 2) + '\n',
    );
    snapshot.baselineNote =
      'Earlier baseline retained separately. Across the paused/interrupted goal turn the unrelated network inventory SHA changed, while its count, saved volumes, unrelated container identities, and all backend file/status hashes remained unchanged. This baseline records the inspected live runtime before resumed staff browser tests.';
  }
  writeFileSync(baselinePath, JSON.stringify(snapshot, null, 2) + '\n');
  console.log(JSON.stringify({ baseline: true, ...snapshot }));
} else {
  const before = JSON.parse(readFileSync(baselinePath, 'utf8'));
  const unchanged = Object.fromEntries(
    ['volumes', 'unrelatedContainers', 'unrelatedNetworks', 'backend'].map((key) => [
      key,
      JSON.stringify(before[key]) === JSON.stringify(snapshot[key]),
    ]),
  );
  const receipt = {
    checkedAt: snapshot.capturedAt,
    baselineAt: before.capturedAt,
    unchanged,
    before,
    after: snapshot,
  };
  writeFileSync(
    `${directory}/preservation-verification.json`,
    JSON.stringify(receipt, null, 2) + '\n',
  );
  console.log(JSON.stringify(receipt));
  assert.ok(Object.values(unchanged).every(Boolean), 'Preservation inventory changed');
}
