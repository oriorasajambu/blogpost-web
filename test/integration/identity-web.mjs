import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';

const context = JSON.parse(readFileSync('.local/live-identity/context.json', 'utf8'));
if (context.state !== 'ready') throw new Error('Start the disposable identity backend first.');
const freePort = () =>
  new Promise((done, reject) => {
    const server = net.createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => done(port));
    });
  });
const directory = resolve('.local/identity-tls');
mkdirSync(directory, { recursive: true });
const keyFile = resolve(directory, 'key.pem'),
  certFile = resolve(directory, 'cert.pem');
const configFile = resolve(directory, 'openssl.cnf');
writeFileSync(configFile, '[req]\ndistinguished_name=dn\n[dn]\n');
execFileSync(
  process.env.OPENSSL_BIN || 'openssl',
  [
    'req',
    '-config',
    configFile,
    '-x509',
    '-newkey',
    'rsa:2048',
    '-nodes',
    '-keyout',
    keyFile,
    '-out',
    certFile,
    '-days',
    '1',
    '-subj',
    '/CN=identity-web.blogpost.test',
    '-addext',
    'subjectAltName=DNS:identity-web.blogpost.test,DNS:identity-api.blogpost.test,DNS:localhost,IP:127.0.0.1',
  ],
  { stdio: 'ignore' },
);
const tls = { key: readFileSync(keyFile), cert: readFileSync(certFile) };
const apiTlsPort = await freePort(),
  cloudPort = await freePort(),
  secureWebPort = await freePort();
const secureOrigin = `https://identity-web.blogpost.test:${secureWebPort}`;
const children = [],
  servers = [];
let stopping = false;
function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const server of servers) server.close();
  for (const child of children) child.kill();
  setTimeout(() => process.exit(code), 500).unref();
}
process.on('SIGINT', () => shutdown());
process.on('SIGTERM', () => shutdown());
const start = (args, env) => {
  const child = spawn(process.execPath, args, {
    env: { ...process.env, ...env },
    stdio: 'inherit',
    windowsHide: true,
  });
  children.push(child);
  child.on('exit', (code) => {
    if (!stopping) shutdown(code || 1);
  });
};
function bridge(origin, port) {
  const server = https.createServer(tls, (request, response) => {
    const headers = { ...request.headers, host: new URL(origin).host };
    const upstream = http.request(
      new URL(request.url, origin),
      { method: request.method, headers },
      (incoming) => {
        response.writeHead(incoming.statusCode, incoming.headers);
        incoming.pipe(response);
      },
    );
    upstream.on('error', () => {
      response.writeHead(502);
      response.end();
    });
    request.on('aborted', () => upstream.destroy());
    request.pipe(upstream);
  });
  servers.push(server);
  return new Promise((done, reject) => {
    server.on('error', reject);
    server.listen(port, '127.0.0.1', done);
  });
}
const common = {
  WEB_LOGIN_ENABLED: 'true',
  WEB_CSRF_SECRET: 'synthetic-local-identity-csrf-secret-not-a-deployment-secret',
  IDENTITY_WEB_API_KEY: 'disposable-identity-key',
  IDENTITY_AUTH_DOMAIN: 'identity-auth.blogpost.test',
  IDENTITY_PROJECT_ID: context.identityProjectId,
  IDENTITY_WEB_APP_ID: '1:123456789:web:1234567890abcdef',
  LOCAL_STACK_ID: context.name,
};
await bridge(context.backendOrigin, apiTlsPort);
start(
  [
    '--import',
    pathToFileURL(resolve('test/integration/identity-dns.mjs')).href,
    'scripts/start.mjs',
    '--port',
    String(cloudPort),
    '--hostname',
    '127.0.0.1',
  ],
  {
    ...common,
    APP_ENV: 'staging',
    IDENTITY_PROJECT_ID: 'blogpost-identity-cookie-policy',
    WEB_ORIGIN: secureOrigin,
    BACKEND_ORIGIN: `https://identity-api.blogpost.test:${apiTlsPort}`,
    NODE_EXTRA_CA_CERTS: certFile,
  },
);
let ready = false;
for (let attempt = 0; attempt < 120; attempt++) {
  try {
    const response = await fetch(`http://127.0.0.1:${cloudPort}/health/live`, {
      signal: AbortSignal.timeout(500),
    });
    await response.body?.cancel();
    if (response.ok) {
      ready = true;
      break;
    }
  } catch {}
  await delay(250);
}
if (!ready) {
  shutdown(1);
  throw new Error('Local HTTPS-policy app did not become ready.');
}
await bridge(`http://127.0.0.1:${cloudPort}`, secureWebPort);
writeFileSync(
  '.local/live-identity/web-runtime.json',
  JSON.stringify(
    { secureOrigin, secureWebPort, apiTlsPort, cloudPort, stackId: context.name },
    null,
    2,
  ) + '\n',
);
start(['scripts/start.mjs', '--port', String(context.webPort), '--hostname', '127.0.0.1'], {
  ...common,
  APP_ENV: 'development',
  WEB_ORIGIN: context.webOrigin,
  BACKEND_ORIGIN: context.backendOrigin,
  IDENTITY_AUTH_EMULATOR_ORIGIN: context.authOrigin,
});
