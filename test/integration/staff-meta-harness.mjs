import http from 'node:http';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';

/** Only metadata is fault-injected. All identity, membership and mutation traffic reaches the real API. */
export async function startMetadataHarness(stack) {
  let mode = 'normal';
  let forwardedWrites = 0;
  const upstream = new URL(stack.backendOrigin);
  const proxy = http.createServer(async (request, response) => {
    try {
      if (
        !request.url?.startsWith('/v1/') ||
        request.url.startsWith('//') ||
        request.url.includes('\\')
      ) {
        response.writeHead(404).end();
        return;
      }
      const bytes = [];
      let size = 0;
      for await (const part of request) {
        size += part.length;
        if (size > 1024 * 1024) {
          response.writeHead(413).end();
          return;
        }
        bytes.push(part);
      }
      const headers = new Headers();
      for (const [name, value] of Object.entries(request.headers)) {
        if (
          ['host', 'connection', 'transfer-encoding', 'content-length'].includes(name) ||
          value === undefined
        )
          continue;
        headers.set(name, Array.isArray(value) ? value.join(', ') : value);
      }
      if (!['GET', 'HEAD'].includes(request.method)) forwardedWrites++;
      const actual = await fetch(new URL(request.url, upstream), {
        method: request.method,
        headers,
        redirect: 'error',
        signal: AbortSignal.timeout(15_000),
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : Buffer.concat(bytes),
      });
      const output = Object.fromEntries(
        [...actual.headers].filter(
          ([name]) =>
            !['connection', 'content-length', 'content-encoding', 'transfer-encoding'].includes(
              name,
            ),
        ),
      );
      if (request.url === '/v1/meta' && actual.ok && mode !== 'normal') {
        const envelope = await actual.json();
        if (mode === 'minimum') envelope.data.clients.web.minimumSupportedVersion = '9.0.0';
        else if (mode === 'retired')
          Object.assign(envelope.data.lifecycle, {
            status: 'RETIRED',
            successorApiMajor: 2,
            noticePublishedAt: '2025-01-01T00:00:00.000Z',
            deprecatedAt: '2026-01-01T00:00:00.000Z',
            sunsetAt: '2026-10-01T00:00:00.000Z',
            migrationGuidePath: '/v2/migration',
          });
        else if (mode === 'incompatible') envelope.data.apiMajor = 2;
        else if (mode === 'outage') {
          const failure = JSON.parse(
            readFileSync('contracts/fixtures/errors/dependency-unavailable.json', 'utf8'),
          );
          failure.traceId = envelope.traceId;
          failure.meta.contractVersion = envelope.meta.contractVersion;
          response.writeHead(503, output).end(JSON.stringify(failure));
          return;
        }
        response.writeHead(actual.status, output).end(JSON.stringify(envelope));
        return;
      }
      response.writeHead(actual.status, output).end(Buffer.from(await actual.arrayBuffer()));
    } catch {
      if (!response.headersSent) response.writeHead(502);
      response.end();
    }
  });
  await new Promise((resolve, reject) => {
    proxy.once('error', reject);
    proxy.listen(0, '127.0.0.1', resolve);
  });
  const proxyOrigin = `http://127.0.0.1:${proxy.address().port}`;
  const reservation = http.createServer();
  await new Promise((resolve) => reservation.listen(0, '127.0.0.1', resolve));
  const port = reservation.address().port;
  await new Promise((resolve) => reservation.close(resolve));
  const origin = `http://localhost:${port}`;
  const stackId = `${stack.name}-metadata`;
  const child = spawn(
    process.execPath,
    ['scripts/start.mjs', '--port', String(port), '--hostname', '127.0.0.1'],
    {
      env: {
        ...process.env,
        APP_ENV: 'development',
        WEB_LOGIN_ENABLED: 'true',
        WEB_ORIGIN: origin,
        BACKEND_ORIGIN: proxyOrigin,
        WEB_CSRF_SECRET: 'synthetic-local-metadata-csrf-secret-not-a-deployment-secret',
        IDENTITY_WEB_API_KEY: 'disposable-staff-key',
        IDENTITY_AUTH_DOMAIN: 'localhost',
        IDENTITY_PROJECT_ID: stack.identityProjectId,
        IDENTITY_WEB_APP_ID: '1:123456789:web:1234567890abcdef',
        IDENTITY_AUTH_EMULATOR_ORIGIN: stack.authOrigin,
        LOCAL_STACK_ID: stackId,
      },
      windowsHide: true,
      stdio: 'ignore',
    },
  );
  let ended = false;
  const exited = new Promise((resolve) => {
    child.once('exit', () => {
      ended = true;
      resolve();
    });
    child.once('error', () => {
      ended = true;
      resolve();
    });
  });
  const stop = async () => {
    if (!ended) {
      child.kill();
      await Promise.race([exited, delay(5000)]);
    }
    if (!ended) {
      child.kill('SIGKILL');
      await exited;
    }
    proxy.closeAllConnections();
    await new Promise((resolve) => proxy.close(resolve));
  };
  try {
    let ready = false;
    for (let attempt = 0; attempt < 60 && !ended; attempt++) {
      try {
        ready = (await fetch(`${origin}/health/live`, { signal: AbortSignal.timeout(1000) })).ok;
      } catch {}
      if (ready) break;
      await delay(100);
    }
    if (!ready) throw new Error('The isolated metadata-policy web process did not become ready.');
    return {
      origin,
      namespace: `blogpost:${stackId}:staff`,
      stop,
      setMode(value) {
        if (!['normal', 'minimum', 'retired', 'incompatible', 'outage'].includes(value))
          throw new Error('Unknown metadata fault');
        mode = value;
      },
      forwardedWrites() {
        return forwardedWrites;
      },
    };
  } catch (error) {
    await stop();
    throw error;
  }
}
