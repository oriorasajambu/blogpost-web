import { spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';

// This runner owns only the disposable resources recorded in its context file.
const root = resolve(import.meta.dirname, '../..');
const purpose = process.env.LIVE_TEST_SUITE ?? 'public';
if (!['public', 'identity', 'editor'].includes(purpose))
  throw new Error('Unsupported disposable integration suite');
const identitySuite = purpose !== 'public';
const fixtureFile = identitySuite ? 'live-identity-fixture.mjs' : 'live-backend-fixture.mjs';
const directory = resolve(root, `.local/live-${purpose}`);
const contextFile = resolve(directory, 'context.json');
const action = process.argv[2] ?? 'status';
const backend = resolve(process.env.LIVE_BACKEND_SOURCE ?? resolve(root, '../blogpost-backend'));
const postgres =
  'postgres:17.11-bookworm@sha256:858bb5e98eed02eb8cafbcdc007f9a65d1b613972028944a8ec2133ccaf80d27';
function run(program, args, cwd = root, capture = true) {
  const result = spawnSync(program, args, {
    cwd,
    encoding: 'utf8',
    windowsHide: true,
    timeout: 600_000,
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    maxBuffer: 8 * 1024 * 1024,
  });
  if (result.error || result.status !== 0)
    throw new Error(
      `${program} ${args[0]} failed: ${result.error?.message ?? result.stderr?.slice(-3000) ?? 'see output'}`,
    );
  return result.stdout?.trim();
}
const docker = (args, capture = true) => run('docker', args, root, capture);
const envArgs = (env) =>
  Object.entries(env).flatMap(([key, value]) => ['--env', `${key}=${value}`]);
const logArgs = ['--log-driver', 'local', '--log-opt', 'max-size=2m', '--log-opt', 'max-file=2'];
const freePort = () =>
  new Promise((resolvePort, reject) => {
    const server = createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => resolvePort(port));
    });
  });
await mkdir(directory, { recursive: true });
let context;
if (action === 'start') {
  try {
    context = JSON.parse(await readFile(contextFile, 'utf8'));
    if (context.state !== 'stopped')
      throw new Error(
        `Existing live-${purpose} context must be stopped before starting another run`,
      );
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const suffix = randomBytes(6).toString('hex');
  const name = `blogpost-web-${purpose}-${suffix}`;
  const source = resolve(directory, `source-${suffix}`);
  const sourceSha = run('git', ['rev-parse', 'HEAD'], backend);
  const branch = run('git', ['branch', '--show-current'], backend);
  run('git', [
    '-c',
    'core.autocrlf=false',
    'clone',
    '--no-hardlinks',
    '--single-branch',
    '--branch',
    branch,
    backend,
    source,
  ]);
  run('git', ['config', 'core.autocrlf', 'false'], source);
  if (
    run('git', ['rev-parse', 'HEAD'], source) !== sourceSha ||
    run('git', ['status', '--porcelain'], source)
  )
    throw new Error('Clean local clone does not match the inspected backend commit');
  const prepared = JSON.parse(run(process.execPath, ['scripts/build/prepare.mjs'], source));
  if (prepared.dirty) throw new Error('Backend build source must be clean');
  const imageTag = `${name}:development`;
  console.log(`Building clean backend commit ${sourceSha}`);
  docker(
    [
      'build',
      '--load',
      '--platform',
      'linux/amd64',
      '--target',
      'development',
      '--tag',
      imageTag,
      '--build-context',
      `blogpost_metadata=${prepared.metadataDirectory}`,
      prepared.sourceDirectory,
    ],
    false,
  );
  const image = docker(['image', 'inspect', '--format', '{{.Id}}', imageTag]);
  const authImage = docker([
    'image',
    'inspect',
    '--format',
    '{{.Id}}',
    process.env.LIVE_AUTH_IMAGE ??
      `blogpost-dev-${createHash('sha256').update(backend.toLowerCase()).digest('hex').slice(0, 8)}-auth:development`,
  ]);
  const apiPort = await freePort();
  const webPort = await freePort();
  const authPort = identitySuite ? await freePort() : undefined;
  const project = `demo-blogpost-identity-${suffix}`;
  context = {
    schemaVersion: 1,
    state: 'starting',
    name,
    sourceSha,
    image,
    imageTag,
    authImage,
    apiPort,
    webPort,
    backendOrigin: `http://127.0.0.1:${apiPort}`,
    webOrigin: `http://localhost:${webPort}`,
    ...(identitySuite
      ? { authPort, authOrigin: `http://127.0.0.1:${authPort}`, identityProjectId: project }
      : {}),
    runtimeInputDigest: prepared.runtimeInputDigest,
    sourceInputDigest: prepared.sourceInputDigest,
    contractStatus: 'DRAFT',
    createdAt: new Date().toISOString(),
  };
  await writeFile(contextFile, JSON.stringify(context, null, 2) + '\n');
  const env = {
    APP_ENV: 'development',
    NODE_ENV: 'development',
    PORT: '8080',
    IDENTITY_PROJECT_ID: project,
    FIREBASE_AUTH_EMULATOR_HOST: 'auth:9099',
    MEDIA_ADAPTER: 'local',
    MEDIA_LOCAL_ROOT: '/data/media',
    API_ORIGIN: context.backendOrigin,
    WEB_ORIGIN: context.webOrigin,
    SQL_HOST: 'db',
    SQL_DATABASE: 'blogpost',
    SQL_APP_PASSWORD: 'disposable-web-public-app',
    CURSOR_SIGNING_KEY: '4'.repeat(64),
  };
  docker(['network', 'create', '--label', 'blogpost.purpose=disposable-web-public-test', name]);
  docker([
    'run',
    '-d',
    '--rm',
    '--pull',
    'never',
    '--name',
    `${name}-db`,
    '--network',
    name,
    '--network-alias',
    'db',
    ...logArgs,
    '--tmpfs',
    '/var/lib/postgresql/data:rw,size=256m',
    ...envArgs({ POSTGRES_DB: 'blogpost', POSTGRES_PASSWORD: 'disposable-web-public-root' }),
    '--health-cmd',
    'pg_isready -U postgres -d blogpost',
    '--health-interval',
    '1s',
    '--health-retries',
    '30',
    postgres,
  ]);
  docker([
    'run',
    '-d',
    '--rm',
    '--pull',
    'never',
    '--name',
    `${name}-auth`,
    '--network',
    name,
    '--network-alias',
    'auth',
    ...logArgs,
    ...(identitySuite ? ['--publish', `127.0.0.1:${authPort}:9099`] : []),
    '--tmpfs',
    '/emulator/data:rw,size=32m',
    ...envArgs({ IDENTITY_PROJECT_ID: project }),
    authImage,
  ]);
  let ready = false;
  for (let i = 0; i < 60; i++) {
    if (docker(['inspect', '--format', '{{.State.Health.Status}}', `${name}-db`]) === 'healthy') {
      ready = true;
      break;
    }
    await delay(500);
  }
  if (!ready) throw new Error('Disposable PostgreSQL did not become healthy');
  const job = (command, extra = {}) =>
    docker(
      [
        'run',
        '--rm',
        '--pull',
        'never',
        '--network',
        name,
        ...logArgs,
        ...envArgs({ ...env, ...extra }),
        image,
        ...command,
      ],
      false,
    );
  job(['npm', 'run', 'db:bootstrap'], {
    SQL_ROOT_PASSWORD: 'disposable-web-public-root',
    SQL_MIGRATOR_PASSWORD: 'disposable-web-public-migrator',
  });
  job(['npm', 'run', 'db:migrate'], { SQL_MIGRATOR_PASSWORD: 'disposable-web-public-migrator' });
  job(['npm', 'run', 'db:verify']);
  docker([
    'run',
    '-d',
    '--rm',
    '--pull',
    'never',
    '--name',
    `${name}-api`,
    '--network',
    name,
    ...logArgs,
    '--tmpfs',
    '/data/media:rw,size=160m,uid=1000,gid=1000,mode=0700',
    '--publish',
    `127.0.0.1:${apiPort}:8080`,
    ...envArgs(env),
    image,
    'node',
    '--import',
    'tsx',
    'src/main.ts',
  ]);
  ready = false;
  for (let i = 0; i < 80; i++) {
    try {
      if (
        (
          await fetch(context.backendOrigin + '/health/ready', {
            signal: AbortSignal.timeout(1000),
          })
        ).ok
      ) {
        ready = true;
        break;
      }
    } catch {}
    await delay(500);
  }
  if (!ready) throw new Error('Disposable API did not become ready');
  docker([
    'cp',
    resolve(import.meta.dirname, fixtureFile),
    `${name}-api:/app/test/web-${purpose}-fixture.mjs`,
  ]);
  context.fixture = JSON.parse(
    docker([
      'exec',
      `${name}-api`,
      'node',
      '--import',
      'tsx',
      `test/web-${purpose}-fixture.mjs`,
      'seed',
    ]),
  );
  context.state = 'ready';
  await writeFile(contextFile, JSON.stringify(context, null, 2) + '\n');
  console.log(JSON.stringify(context, null, 2));
} else {
  context = JSON.parse(await readFile(contextFile, 'utf8'));
  if (!new RegExp(`^blogpost-web-${purpose}-[a-f0-9]{12}$`).test(context.name))
    throw new Error('Invalid disposable resource identity');
  if (action === 'status') {
    docker(['inspect', '--format', '{{.State.Status}}', `${context.name}-api`]);
    console.log(JSON.stringify(context, null, 2));
  } else if (
    (identitySuite
      ? [
          'token',
          'invitation',
          'renew-invitation',
          'private-post',
          'account',
          'expire-invitation',
          'disable',
          'enable',
          'revoke',
          'expired-session',
          'stale-id-token',
          'state',
          'identity-capacity',
        ]
      : ['draft', 'correct', 'rename', 'withdraw']
    ).includes(action)
  ) {
    const result = JSON.parse(
      docker([
        'exec',
        `${context.name}-api`,
        'node',
        '--import',
        'tsx',
        `test/web-${purpose}-fixture.mjs`,
        action,
        ...(identitySuite ? process.argv.slice(3) : []),
      ]),
    );
    if (!identitySuite) {
      context.fixture = result;
      await writeFile(contextFile, JSON.stringify(context, null, 2) + '\n');
    }
    console.log(JSON.stringify(result));
  } else if (action === 'stop') {
    // Inventory failures propagate: an unavailable daemon is not proof of absence.
    const containers = new Set(docker(['ps', '--all', '--format', '{{.Names}}']).split(/\r?\n/));
    for (const kind of ['api', 'auth', 'db']) {
      const resource = `${context.name}-${kind}`;
      if (containers.has(resource)) docker(['stop', resource]);
    }
    const networks = new Set(docker(['network', 'ls', '--format', '{{.Name}}']).split(/\r?\n/));
    if (networks.has(context.name)) docker(['network', 'rm', context.name]);
    context.state = 'stopped';
    context.stoppedAt = new Date().toISOString();
    await writeFile(contextFile, JSON.stringify(context, null, 2) + '\n');
    console.log('Stopped only this disposable test stack; no saved volumes were used.');
  } else
    throw new Error('Use start, status, stop or a supported fixture action for this test suite.');
}
