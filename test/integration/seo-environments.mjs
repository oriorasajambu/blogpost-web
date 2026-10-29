import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import http from 'node:http';

const directory = resolve('.local/seo-tls');
mkdirSync(directory, { recursive: true });
const key = resolve(directory, 'key.pem');
const cert = resolve(directory, 'cert.pem');
const opensslConfig = resolve(directory, 'openssl.cnf');
writeFileSync(opensslConfig, '[req]\ndistinguished_name=dn\n[dn]\n');
execFileSync(
  process.env.OPENSSL_BIN || 'openssl',
  [
    'req',
    '-config',
    opensslConfig,
    '-x509',
    '-newkey',
    'rsa:2048',
    '-nodes',
    '-keyout',
    key,
    '-out',
    cert,
    '-days',
    '1',
    '-subj',
    '/CN=public-api.blogpost.test',
    '-addext',
    'subjectAltName=DNS:public-api.blogpost.test',
  ],
  { stdio: 'ignore' },
);
const children = [];
const readiness = http.createServer(async (_request, response) => {
  try {
    const results = await Promise.all(
      [3102, 3103, 3104].map((port) =>
        fetch(`http://127.0.0.1:${port}/health/live`, { signal: AbortSignal.timeout(1000) }),
      ),
    );
    response.writeHead(results.every((result) => result.ok) ? 200 : 503);
  } catch {
    response.writeHead(503);
  }
  response.end();
});
readiness.listen(3105, '127.0.0.1');
const run = (args, env) => {
  const child = spawn(process.execPath, args, {
    env: { ...process.env, ...env },
    stdio: 'inherit',
  });
  children.push(child);
  child.on('exit', (code) => {
    if (code && !stopping) shutdown(code);
  });
};
let stopping = false;
function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  readiness.close();
  for (const child of children) child.kill();
  setTimeout(() => process.exit(code), 300).unref();
}
process.on('SIGINT', () => shutdown());
process.on('SIGTERM', () => shutdown());
run(['test/e2e/fixture-server.mjs'], { TEST_TLS_CERT_FILE: cert, TEST_TLS_KEY_FILE: key });
for (const [environment, port, origin] of [
  ['production', '3102', 'https://publication.blogpost.test'],
  ['staging', '3103', 'https://staging.blogpost.test'],
  ['development', '3104', ''],
]) {
  run(
    [
      '--import',
      pathToFileURL(resolve('test/integration/seo-dns.mjs')).href,
      'scripts/start.mjs',
      '--port',
      port,
      '--hostname',
      '127.0.0.1',
    ],
    {
      APP_ENV: environment,
      BACKEND_ORIGIN:
        environment === 'development'
          ? 'http://127.0.0.1:4110'
          : 'https://public-api.blogpost.test:4111',
      WEB_ORIGIN: origin,
      WEB_LOGIN_ENABLED: 'false',
      LOCAL_STACK_ID: 'seo-environments',
      NODE_EXTRA_CA_CERTS: cert,
    },
  );
}
