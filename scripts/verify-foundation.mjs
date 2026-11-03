import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const readJson = async (name) => JSON.parse(await readFile(path.join(root, name), 'utf8'));
const [pkg, lock, release] = await Promise.all([
  readJson('package.json'),
  readJson('package-lock.json'),
  readJson('.release/release.json'),
]);

assert.equal(release.application, 'web', 'Release marker must identify the web application.');
assert.equal(release.version, pkg.version, 'Release and package versions must agree.');
assert.equal(release.version, lock.version, 'Release and lockfile versions must agree.');
assert.equal(
  release.version,
  lock.packages[''].version,
  'Lockfile root package version must agree.',
);
assert.equal(
  release.version,
  '0.0.0',
  'Foundation is unreleased; implement release governance before versioning a release.',
);
assert.equal(release.publish, false, 'Foundation cannot publish against an unreleased contract.');
assert.equal(release.apiContractVersion, '1.0.0', 'Unexpected API contract major.');

const git = (...args) =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
let isOwnRepository = false;
try {
  isOwnRepository =
    path.resolve(git('rev-parse', '--show-toplevel').trim()).toLowerCase() ===
    path.resolve(root).toLowerCase();
} catch {
  // A newly authored checkout can be verified before its repository bootstrap.
}

const excludedDirectories = new Set([
  '.git',
  '.next',
  'node_modules',
  '.local',
  'coverage',
  'playwright-report',
  'test-results',
]);
async function sourceFiles(directory = root) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!excludedDirectories.has(entry.name)) result.push(...(await sourceFiles(absolute)));
    } else if (entry.isFile()) result.push(path.relative(root, absolute).replaceAll(path.sep, '/'));
  }
  return result;
}

function checkFileNames(names) {
  for (const name of names) {
    if (!name) continue;
    const basename = name.split(/[\\/]/).at(-1);
    assert.ok(
      !/^\.env(?:\.|$)/i.test(basename) || basename === '.env.example',
      `Forbidden environment file: ${name}`,
    );
    assert.ok(
      !/\.(?:jks|keystore|p12|pfx)$/i.test(basename),
      `Signing material is forbidden: ${name}`,
    );
    assert.ok(
      !/^gha-creds-.*\.json$/i.test(basename),
      `Generated credentials are forbidden: ${name}`,
    );
  }
}

checkFileNames(isOwnRepository ? git('ls-files', '-z').split('\0') : await sourceFiles());

const workBranch = /^(?:feature|bug|chore|docs)\/[a-z0-9]+(?:-[a-z0-9]+)*$/;
if (process.env.GITHUB_EVENT_NAME === 'pull_request') {
  const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const pr = event.pull_request;
  const sameRepository = pr.head.repo?.full_name === pr.base.repo.full_name;
  if (pr.base.ref === 'main') {
    assert.ok(
      sameRepository && pr.head.ref === 'rc',
      'Only the same-repository rc branch may target main.',
    );
    throw new Error(
      'Promotion is blocked: complete contract freeze, staging/manual evidence, real-backend client journeys, and release/deployment controls before enabling main promotion.',
    );
  }
  assert.equal(pr.base.ref, 'rc', 'Normal work must target rc.');
  assert.ok(
    workBranch.test(pr.head.ref) || (sameRepository && pr.head.ref === 'main'),
    'Use feature/, bug/, chore/, or docs/ branches; main to rc is the synchronization exception.',
  );
  if (isOwnRepository) {
    // Inspect every introduced commit, including files subsequently removed.
    const commits = git('rev-list', `${pr.base.sha}..${pr.head.sha}`)
      .trim()
      .split('\n')
      .filter(Boolean);
    for (const commit of commits)
      checkFileNames(git('ls-tree', '-r', '--name-only', '-z', commit).split('\0'));
  }
} else if (process.env.GITHUB_EVENT_NAME === 'push') {
  assert.ok(
    workBranch.test(process.env.GITHUB_REF_NAME ?? ''),
    'Foundation pushes must use a permitted work branch.',
  );
  const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, 'utf8'));
  if (isOwnRepository && event.before && !/^0+$/.test(event.before)) {
    const commits = git('rev-list', `${event.before}..${event.after}`)
      .trim()
      .split('\n')
      .filter(Boolean);
    for (const commit of commits)
      checkFileNames(git('ls-tree', '-r', '--name-only', '-z', commit).split('\0'));
  } else if (isOwnRepository && event.after) {
    // A newly pushed branch may introduce its whole history.
    for (const commit of git('rev-list', event.after).trim().split('\n').filter(Boolean)) {
      checkFileNames(git('ls-tree', '-r', '--name-only', '-z', commit).split('\0'));
    }
  }
}

console.log(
  'Foundation metadata, branch policy, and forbidden-file checks passed. This does not establish release readiness or replace secret scanning.',
);
