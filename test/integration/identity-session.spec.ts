import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import {
  test,
  expect,
  type APIRequestContext,
  type Browser,
  type BrowserContext,
  type Page,
} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { captureWebProvenance, matchingWebProvenance } from './web-source-provenance.mjs';

const context = JSON.parse(readFileSync('.local/live-identity/context.json', 'utf8'));
const webProvenance = captureWebProvenance();
const fixture = (action: string, label = 'author') =>
  JSON.parse(
    execFileSync(process.execPath, ['test/integration/live-identity-backend.mjs', action, label], {
      encoding: 'utf8',
      windowsHide: true,
    }),
  );
const sessionName = `blogpost_${context.name}_session`;
const csrfName = `blogpost_${context.name}_csrf`;
const executed: { title: string; status: string; durationMs: number }[] = [];
let browserInfo: { engine: string; version: string; channel: string; headless: boolean };
let emulatorResources: { iframeHtmlBytes: number; googleLoaderBytes: number } | undefined;
let secureCookiePolicy:
  { name: string; secure: boolean; httpOnly: boolean; sameSite: string; path: string } | undefined;
test.beforeAll(async ({ browser }, info) => {
  browserInfo = {
    engine: browser.browserType().name(),
    version: browser.version(),
    channel: info.project.use.channel ?? 'default',
    headless: info.project.use.headless ?? true,
  };
});
test.beforeEach(async ({}, info) => {
  // Several independent scenarios intentionally reuse a synthetic member. Wait for
  // real SQL quota expiry instead of weakening limits or retrying a failed assertion.
  const { retryAfterMs } = fixture('identity-capacity');
  expect(retryAfterMs).toBeGreaterThanOrEqual(0);
  expect(retryAfterMs).toBeLessThanOrEqual(61_000);
  if (retryAfterMs > 0) {
    test.setTimeout(info.timeout + retryAfterMs);
    await delay(retryAfterMs);
  }
});
test.afterEach(async ({}, info) => {
  executed.push({ title: info.title, status: info.status ?? 'unknown', durationMs: info.duration });
});
test.afterAll(() => {
  const webAfter = captureWebProvenance();
  const sourceAndBuildUnchanged = matchingWebProvenance(webProvenance, webAfter);
  const total = (
    readFileSync('test/integration/identity-session.spec.ts', 'utf8').match(/^test\(/gm) ?? []
  ).length;
  const passed =
    sourceAndBuildUnchanged &&
    executed.length === total &&
    executed.every((result) => result.status === 'passed');
  const report = {
    schemaVersion: 1,
    status: passed ? 'PASSED' : 'INCOMPLETE',
    testedAt: new Date().toISOString(),
    webBuildId: readFileSync('.next/BUILD_ID', 'utf8').trim(),
    browser: browserInfo,
    emulatorResources,
    webProvenance: {
      ...webProvenance,
      verifiedAt: webAfter.capturedAt,
      sourceAndBuildUnchanged,
      captureScope: 'Before and after the complete suite',
    },
    backendSourceSha: context.sourceSha,
    backendImage: context.image,
    authImage: context.authImage,
    runtimeInputDigest: context.runtimeInputDigest,
    sourceInputDigest: context.sourceInputDigest,
    contractStatus: context.contractStatus,
    scope:
      'Actual local PostgreSQL membership, Authentication Emulator Google SDK flows, session/CSRF/proxy boundaries and browser HTTPS cookie policy',
    providerSmoke: 'Not a configured real Google provider smoke',
    secureCookie: secureCookiePolicy,
    tests: executed,
  };
  mkdirSync('.local/live-identity', { recursive: true });
  writeFileSync('.local/live-identity/latest-run.json', JSON.stringify(report, null, 2) + '\n');
  if (passed && secureCookiePolicy) {
    mkdirSync('docs/identity-sessions', { recursive: true });
    writeFileSync(
      'docs/identity-sessions/local-validation.json',
      JSON.stringify(report, null, 2) + '\n',
    );
  }
  if (!sourceAndBuildUnchanged)
    throw new Error('Production source or build changed during the identity suite.');
});
async function csrf(request: APIRequestContext) {
  const response = await request.get('/api/csrf');
  expect(response.status()).toBe(200);
  return (await response.json()).token as string;
}
function mutation(token: string) {
  return { Origin: context.webOrigin, 'X-CSRF-Token': token, 'content-type': 'application/json' };
}
const emulatorTransport = new WeakMap<BrowserContext, Record<string, unknown>[]>();
function observeEmulatorTransport(session: BrowserContext) {
  const records: Record<string, unknown>[] = [];
  emulatorTransport.set(session, records);
  const record = (value: Record<string, unknown>) => {
    if (records.length < 80) records.push(value);
  };
  const selected = (value: string) => {
    const url = new URL(value);
    return url.pathname === '/emulator/auth/iframe' || url.origin === 'https://apis.google.com';
  };
  const location = (value: string) => {
    const url = new URL(value);
    return {
      origin: url.origin,
      path: url.pathname,
      queryKeys: [...url.searchParams.keys()].sort(),
    };
  };
  session.on('request', (request) => {
    if (selected(request.url())) record({ event: 'request', ...location(request.url()) });
  });
  session.on('requestfailed', (request) => {
    if (selected(request.url()))
      record({
        event: 'failed',
        ...location(request.url()),
        failure: request.failure()?.errorText.match(/net::[A-Z_]+/)?.[0] ?? 'network failure',
      });
  });
  session.on('response', (response) => {
    if (!selected(response.url())) return;
    record({
      event: 'response',
      ...location(response.url()),
      status: response.status(),
      contentType: response.headers()['content-type'] ?? '',
      contentLength: response.headers()['content-length'] ?? '',
    });
    void response
      .body()
      .then((body) => record({ event: 'body', ...location(response.url()), bytes: body.length }))
      .catch(() => record({ event: 'body-incomplete', ...location(response.url()) }));
  });
  session.on('page', (page) => {
    page.on('dialog', (dialog) => {
      const message = dialog.message();
      record({
        event: 'dialog',
        type: dialog.type(),
        missingQueryParams: /Missing query params/.test(message),
        gapiTimeout: /loading gapi/.test(message),
        eventSendFailure: /Sending authEvent failed/.test(message),
      });
      void dialog.dismiss();
    });
  });
}
async function readyEmulatorPopup(page: Page, popup: Page) {
  await popup.waitForURL(/\/emulator\/auth\/handler/, { waitUntil: 'load' });
  await popup.waitForFunction(
    () =>
      location.pathname === '/emulator/auth/handler' &&
      document.readyState === 'complete' &&
      typeof (window as Window & { finishWithUser?: unknown }).finishWithUser === 'function',
    undefined,
    { timeout: 30_000, polling: 100 },
  );
  const relayPath = '/emulator/auth/iframe';
  await expect
    .poll(
      () =>
        page.frames().some((frame) => {
          try {
            return new URL(frame.url()).pathname === relayPath;
          } catch {
            return false;
          }
        }),
      { timeout: 30_000, intervals: [100] },
    )
    .toBe(true);
  const relay = page.frames().find((frame) => {
    try {
      return new URL(frame.url()).pathname === relayPath;
    } catch {
      return false;
    }
  })!;
  // The pinned emulator initializes its gapi relay independently of the picker.
  // Observe readiness only; do not synthesize auth events or mutate SDK state.
  // This iframe is hidden, so poll with a timer rather than animation frames.
  try {
    await relay.waitForFunction(
      () => Boolean((window as Window & { parentContainer?: unknown }).parentContainer),
      undefined,
      { timeout: 30_000, polling: 100 },
    );
  } catch {
    const state = await relay.evaluate(() => {
      const view = window as Window & {
        parentContainer?: unknown;
        gapi?: { load?: unknown; iframes?: unknown };
        gapi_onload?: unknown;
      };
      return {
        path: location.pathname,
        origin: location.origin,
        queryKeys: [...new URLSearchParams(location.search).keys()].sort(),
        documentState: document.readyState,
        documentLength: document.documentElement?.outerHTML.length ?? 0,
        authTitlePresent: document.title === 'Auth Emulator Helper Iframe',
        inlineScriptLengths: [...document.scripts]
          .filter((script) => !script.src)
          .map((script) => script.textContent?.length ?? 0),
        parentContainerDeclared: Object.prototype.hasOwnProperty.call(window, 'parentContainer'),
        parentContainerReady: Boolean(view.parentContainer),
        gapiType: typeof view.gapi,
        gapiLoaderType: typeof view.gapi?.load,
        gapiIframesType: typeof view.gapi?.iframes,
        gapiOnloadType: typeof view.gapi_onload,
        scripts: performance
          .getEntriesByType('resource')
          .filter((entry) => (entry as PerformanceResourceTiming).initiatorType === 'script')
          .map((entry) => ({
            path: new URL(entry.name).origin + new URL(entry.name).pathname,
            durationMs: Math.round(entry.duration),
          })),
      };
    });
    const matchingFrames = page
      .frames()
      .filter((frame) => {
        try {
          return new URL(frame.url()).pathname === relayPath;
        } catch {
          return false;
        }
      })
      .map((frame) => {
        const url = new URL(frame.url());
        return {
          origin: url.origin,
          path: url.pathname,
          queryKeys: [...url.searchParams.keys()].sort(),
        };
      });
    throw new Error(
      `Emulator relay initialization failed: ${JSON.stringify({ state, matchingFrames, transport: emulatorTransport.get(page.context()) })}`,
    );
  }
}
function authResponse(page: Page, path: '/api/session' | '/api/invitations/accept') {
  return page.waitForResponse(
    (response) => {
      const url = new URL(response.url());
      return (
        url.origin === context.webOrigin &&
        url.pathname === path &&
        response.request().method() === 'POST'
      );
    },
    { timeout: 30_000 },
  );
}
async function login(browser: Browser, label = 'author'): Promise<BrowserContext> {
  const session = await browser.newContext({ baseURL: context.webOrigin });
  const credential = fixture('token', label);
  const response = await session.request.post('/api/session', {
    headers: mutation(await csrf(session.request)),
    data: { idToken: credential.idToken },
  });
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.member.role).toBe(
    label === 'other' ? 'AUTHOR' : context.fixture.accounts[label].role,
  );
  expect(JSON.stringify(body).includes(credential.idToken)).toBe(false);
  expect('sessionCookie' in body).toBe(false);
  return session;
}

test('real author/editor/admin sessions retain five-day HttpOnly cookies and enforce backend roles', async ({
  browser,
}) => {
  for (const role of ['author', 'editor', 'admin']) {
    const session = await login(browser, role);
    try {
      const cookie = (await session.cookies()).find((value) => value.name === sessionName)!;
      expect(cookie.httpOnly).toBe(true);
      expect(cookie.sameSite).toBe('Lax');
      expect(cookie.path).toBe('/');
      expect(cookie.expires - Date.now() / 1000).toBeGreaterThan(431_900);
      expect(cookie.expires - Date.now() / 1000).toBeLessThanOrEqual(432_001);
      const me = await session.request.get('/api/editorial/me');
      expect(me.status()).toBe(200);
      expect((await me.json()).data.role).toBe(role.toUpperCase());
      expect(me.headers()['x-api-contract-version']).toBe('1.0.0');
      const admin = await session.request.get('/api/editorial/admin/members');
      expect(admin.status()).toBe(role === 'admin' ? 200 : 403);
      const page = await session.newPage();
      await page.goto('/studio');
      await expect(page.getByRole('heading', { name: 'Your staff workspace' })).toBeVisible();
      if (role === 'author') {
        expect(
          (
            await new AxeBuilder({ page })
              .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
              .analyze()
          ).violations,
        ).toEqual([]);
        await page.goto('/studio/admin');
        await expect(
          page.getByRole('heading', { name: 'This area is not available for your role.' }),
        ).toBeVisible();
      }
    } finally {
      await session.close();
    }
  }
});

test('uninvited and stale-auth identities cannot mint a web session', async ({ browser }) => {
  for (const [action, label, expected] of [
    ['token', 'outsider', 403],
    ['stale-id-token', 'author', 401],
  ] as const) {
    const session = await browser.newContext({ baseURL: context.webOrigin });
    try {
      const response = await session.request.post('/api/session', {
        headers: mutation(await csrf(session.request)),
        data: { idToken: fixture(action, label).idToken },
      });
      expect(response.status()).toBe(expected);
      expect((await session.cookies()).some((cookie) => cookie.name === sessionName)).toBe(false);
    } finally {
      await session.close();
    }
  }
});

test('CSRF rejects missing, forged, stale-session and cross-origin tokens; login replaces a fixed session', async ({
  browser,
}) => {
  const session = await browser.newContext({ baseURL: context.webOrigin });
  try {
    await session.addCookies([
      {
        name: sessionName,
        value: 'attacker-fixed-session',
        url: context.webOrigin,
        httpOnly: true,
      },
    ]);
    const anonymousToken = await csrf(session.request);
    const idToken = fixture('token').idToken;
    for (const headers of [
      { Origin: context.webOrigin, 'content-type': 'application/json' },
      { ...mutation(anonymousToken), Origin: 'https://attacker.invalid' },
      mutation(anonymousToken + 'forged'),
    ])
      expect(
        (await session.request.post('/api/session', { headers, data: { idToken } })).status(),
      ).toBe(403);
    const signedIn = await session.request.post('/api/session', {
      headers: mutation(anonymousToken),
      data: { idToken },
    });
    expect(signedIn.status()).toBe(200);
    expect((await session.cookies()).find((value) => value.name === sessionName)?.value).not.toBe(
      'attacker-fixed-session',
    );
    expect(
      (
        await session.request.post('/api/session/logout', {
          headers: mutation(anonymousToken),
          data: {},
        })
      ).status(),
    ).toBe(403);
    const current = await csrf(session.request);
    expect(
      (
        await session.request.post('/api/session/logout', {
          headers: { ...mutation(current), 'content-type': 'text/plain' },
          data: '{}',
        })
      ).status(),
    ).toBe(415);
    expect(
      (
        await session.request.post('/api/session/logout', { headers: mutation(current), data: {} })
      ).status(),
    ).toBe(200);
    expect(
      (await session.cookies()).some((value) => [sessionName, csrfName].includes(value.name)),
    ).toBe(false);
    expect((await session.request.get('/api/editorial/me')).status()).toBe(401);
  } finally {
    await session.close();
  }
});

test('proxy ignores browser identity assertions, arbitrary paths and unbounded bodies', async ({
  browser,
}) => {
  const member = await login(browser);
  const anonymous = await browser.newContext({ baseURL: context.webOrigin });
  try {
    const cookie = (await member.cookies()).find((value) => value.name === sessionName)!;
    const forged = await anonymous.request.get('/api/editorial/me', {
      headers: {
        'x-blogpost-web-session': cookie.value,
        authorization: `Bearer ${fixture('token', 'admin').idToken}`,
        'x-member-role': 'ADMIN',
        'x-user-id': context.fixture.accounts.admin.memberId,
      },
    });
    expect(forged.status()).toBe(401);
    for (const path of [
      '/api/editorial/auth/web-session',
      '/api/editorial/public/posts',
      '/api/editorial/https:%2F%2Fattacker.invalid',
    ])
      expect((await member.request.get(path)).status()).toBe(404);
    const token = await csrf(member.request);
    const profile = await (await member.request.get('/api/editorial/me')).json();
    const tooLarge = await member.request.patch('/api/editorial/me', {
      headers: {
        ...mutation(token),
        'Idempotency-Key': randomUUID(),
        'X-Expected-Version': String(profile.data.version),
      },
      data: { bio: 'x'.repeat(1048577) },
    });
    expect(tooLarge.status()).toBe(413);
    const multipart = await member.request.post(`/api/editorial/posts/${randomUUID()}/media`, {
      headers: {
        Origin: context.webOrigin,
        'X-CSRF-Token': token,
        'Idempotency-Key': randomUUID(),
      },
      multipart: {
        file: { name: 'oversized.png', mimeType: 'image/png', buffer: Buffer.alloc(5242881) },
      },
    });
    expect(multipart.status()).toBe(413);
    const wholeRequest = await member.request.post(`/api/editorial/posts/${randomUUID()}/media`, {
      headers: {
        Origin: context.webOrigin,
        'X-CSRF-Token': token,
        'Idempotency-Key': randomUUID(),
      },
      multipart: {
        file: { name: 'small.png', mimeType: 'image/png', buffer: Buffer.alloc(70) },
        padding: 'x'.repeat(6291456),
      },
    });
    expect(wholeRequest.status()).toBe(413);
  } finally {
    await member.close();
    await anonymous.close();
  }
});

test('a browser bearer assertion cannot change the cookie identity and cross-author drafts remain unavailable', async ({
  browser,
}) => {
  const post = fixture('private-post');
  const author = await login(browser);
  const other = await login(browser, 'other');
  try {
    const spoofed = await author.request.get('/api/editorial/me', {
      headers: {
        authorization: `Bearer ${fixture('token', 'admin').idToken}`,
        'x-blogpost-web-session': 'forged-browser-session',
      },
    });
    expect(spoofed.status()).toBe(200);
    expect((await spoofed.json()).data.role).toBe('AUTHOR');
    expect((await author.request.get(`/api/editorial/posts/${post.id}`)).status()).toBe(200);
    const unavailable = await other.request.get(`/api/editorial/posts/${post.id}`);
    expect(unavailable.status()).toBe(404);
    expect(await unavailable.text()).not.toContain('PRIVATE_IDENTITY_AUTHOR_DRAFT');
  } finally {
    await author.close();
    await other.close();
  }
});

test('invitation landings scrub both token URL formats before HTML and protect redirect continuity', async ({
  browser,
}) => {
  const session = await browser.newContext({ baseURL: context.webOrigin });
  try {
    fixture('renew-invitation', 'invitee');
    const invitation = fixture('invitation', 'invitee');
    for (const path of [
      `/invite/${invitation.token}`,
      `/invitations/accept?token=${invitation.token}`,
    ]) {
      const landed = await session.request.get(path, { maxRedirects: 0 });
      expect(landed.status()).toBe(303);
      expect(landed.headers().location).toBe('/invite');
      expect(landed.headers()['referrer-policy']).toBe('no-referrer');
      expect(landed.headers()['cache-control']).toContain('no-store');
      expect((await landed.text()).includes(invitation.token)).toBe(false);
      const flowCookie = (await session.cookies()).find((cookie) =>
        cookie.name.endsWith('_oauth_state'),
      )!;
      expect(flowCookie.httpOnly).toBe(true);
      expect(flowCookie.value.includes(invitation.token)).toBe(false);
    }
    const token = await csrf(session.request);
    const flow = await session.request.get('/api/auth/redirect', {
      headers: { 'X-CSRF-Token': token },
    });
    expect(flow.status()).toBe(200);
    expect(await flow.json()).toMatchObject({ pending: true, invitation: true });
    expect((await session.request.get('/api/auth/redirect')).status()).toBe(403);
    const prepared = await session.request.post('/api/auth/redirect', {
      headers: mutation(token),
      data: { returnTo: 'https://attacker.invalid' },
    });
    expect(prepared.status()).toBe(200);
    const receipt = await prepared.json();
    expect(receipt.returnTo).toBe('/studio/posts');
    expect(
      (
        await session.request.get('/api/auth/redirect', {
          headers: { 'X-CSRF-Token': token, 'X-OAuth-State': 'forged-state' },
        })
      ).status(),
    ).toBe(403);
    const restored = await session.request.get('/api/auth/redirect', {
      headers: { 'X-CSRF-Token': token, 'X-OAuth-State': receipt.state },
    });
    expect(restored.status()).toBe(200);
    expect(await restored.json()).toMatchObject({
      pending: true,
      invitation: true,
      returnTo: '/studio/posts',
    });
    const accepted = await session.request.post('/api/invitations/accept', {
      headers: { ...mutation(token), 'Idempotency-Key': invitation.key },
      data: { flow: true, idToken: fixture('token', 'invitee').idToken },
    });
    expect(accepted.status()).toBe(200);
    expect((await accepted.text()).includes(invitation.token)).toBe(false);
  } finally {
    await session.close();
  }
});

test('invitation mismatch preserves the invitation; matching verified identity accepts once and then exchanges a session', async ({
  browser,
}) => {
  const session = await browser.newContext({ baseURL: context.webOrigin });
  try {
    fixture('renew-invitation', 'target');
    const invitation = fixture('invitation', 'target');
    const csrfToken = await csrf(session.request);
    const mismatch = await session.request.post('/api/invitations/accept', {
      headers: { ...mutation(csrfToken), 'Idempotency-Key': randomUUID() },
      data: { token: invitation.token, idToken: fixture('token', 'mismatch').idToken },
    });
    expect(mismatch.status()).toBe(403);
    expect((await mismatch.json()).error.code).toBe('INVITATION_ACCOUNT_MISMATCH');
    expect(
      fixture('state').invitations.find((value: { id: string }) => value.id === invitation.id)
        .acceptedAt,
    ).toBeNull();
    const credential = fixture('token', 'target');
    const accepted = await session.request.post('/api/invitations/accept', {
      headers: { ...mutation(csrfToken), 'Idempotency-Key': invitation.key },
      data: { token: invitation.token, idToken: credential.idToken },
    });
    expect(accepted.status()).toBe(200);
    const acceptedMember = (await accepted.json()).member;
    expect(acceptedMember.role).toBe('AUTHOR');
    expect((await session.cookies()).some((value) => value.name === sessionName)).toBe(false);
    const replayed = await session.request.post('/api/invitations/accept', {
      headers: { ...mutation(csrfToken), 'Idempotency-Key': invitation.key },
      data: { token: invitation.token, idToken: credential.idToken },
    });
    expect(replayed.status()).toBe(200);
    expect((await replayed.json()).member.id).toBe(acceptedMember.id);
    const exchanged = await session.request.post('/api/session', {
      headers: mutation(csrfToken),
      data: { idToken: credential.idToken },
    });
    expect(exchanged.status()).toBe(200);
    const used = await session.request.post('/api/invitations/accept', {
      headers: { ...mutation(await csrf(session.request)), 'Idempotency-Key': randomUUID() },
      data: { token: invitation.token, idToken: credential.idToken },
    });
    expect(used.status()).toBe(410);
    expect((await used.json()).error.code).toBe('INVITATION_USED');
  } finally {
    await session.close();
  }
});

test('expired invitations and expired session claims retain clear authoritative denial', async ({
  browser,
}) => {
  const session = await browser.newContext({ baseURL: context.webOrigin });
  try {
    fixture('renew-invitation', 'expired');
    const invitation = fixture('invitation', 'expired');
    const response = await session.request.post('/api/invitations/accept', {
      headers: { ...mutation(await csrf(session.request)), 'Idempotency-Key': randomUUID() },
      data: { token: invitation.token, idToken: fixture('token', 'expired').idToken },
    });
    expect(response.status()).toBe(410);
    expect((await response.json()).error.code).toBe('INVITATION_EXPIRED');
    await session.addCookies([
      {
        name: sessionName,
        value: fixture('expired-session').sessionCookie,
        url: context.webOrigin,
        httpOnly: true,
      },
    ]);
    expect((await session.request.get('/api/editorial/me')).status()).toBe(401);
    expect((await session.request.get('/studio', { maxRedirects: 0 })).status()).toBe(307);
  } finally {
    await session.close();
  }
});

test('live SQL disablement and provider revocation stop previously issued sessions', async ({
  browser,
}) => {
  const session = await login(browser);
  try {
    const page = await session.newPage();
    await page.goto('/studio');
    await expect(page.getByRole('heading', { name: 'Your staff workspace' })).toBeVisible();
    const recoveryKey = `blogpost:${context.name}:staff:recovery`;
    await page.evaluate(
      (key) =>
        localStorage.setItem(
          key,
          JSON.stringify([
            {
              id: 'revoked-draft',
              title: 'Synthetic recovery draft',
              markdown: 'Kept for export.',
              unsynced: true,
            },
          ]),
        ),
      recoveryKey,
    );
    fixture('disable');
    const traceId = '4f8a39d6b2514ec0ba935ad49752ef10';
    const traceparent = `00-${traceId}-a4c93b18f0284d52-01`;
    const sessionCookie = (await session.cookies()).find((value) => value.name === sessionName)!;
    const upstream = await session.request.get(context.backendOrigin + '/v1/me', {
      headers: {
        traceparent,
        'X-Device-ID': randomUUID(),
        'X-Device-OS': 'UNKNOWN',
        'X-Device-Version': 'unknown',
        'X-App-Version': '0.0.0',
        'X-App-Language': 'en',
        'X-Blogpost-Web-Session': sessionCookie.value,
      },
    });
    expect(upstream.status()).toBe(403);
    const original = await upstream.json();
    delete original.timestamp;
    expect(original.error.code).toBe('ACCESS_REVOKED');
    for (const route of ['/api/session', '/api/editorial/me']) {
      const denied = await session.request.get(route, { headers: { traceparent } });
      expect(denied.status()).toBe(403);
      expect(denied.headers()['x-trace-id']).toBe(traceId);
      expect(denied.headers()['x-api-contract-version']).toBe(
        upstream.headers()['x-api-contract-version'],
      );
      expect(denied.headers()['retry-after']).toBe(upstream.headers()['retry-after']);
      const forwarded = await denied.json();
      delete forwarded.timestamp;
      expect(forwarded).toEqual(original);
    }
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(page.getByRole('heading', { name: 'Staff access is unavailable.' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Your staff workspace' })).toHaveCount(0);
    expect(await page.evaluate((key) => localStorage.getItem(key) !== null, recoveryKey)).toBe(
      true,
    );
    fixture('enable');
    expect((await session.request.get('/api/editorial/me')).status()).toBe(200);
    fixture('revoke');
    expect((await session.request.get('/api/editorial/me')).status()).toBe(401);
  } finally {
    fixture('enable');
    await session.close();
  }
});

test('HTTPS staging policy creates browser-accepted Host cookies and hides the session from scripts', async ({
  browser,
}) => {
  const runtime = JSON.parse(readFileSync('.local/live-identity/web-runtime.json', 'utf8'));
  const session = await browser.newContext({ ignoreHTTPSErrors: true });
  try {
    const page = await session.newPage();
    await page.goto(runtime.secureOrigin + '/sign-in');
    const credential = fixture('token', 'editor');
    const result = await page.evaluate(async (idToken: string) => {
      const csrfResponse = await fetch('/api/csrf');
      const csrfBody = await csrfResponse.json();
      const loginResponse = await fetch('/api/session', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'X-CSRF-Token': csrfBody.token },
        body: JSON.stringify({ idToken }),
      });
      return {
        status: loginResponse.status,
        body: await loginResponse.json(),
        cookies: document.cookie,
      };
    }, credential.idToken);
    expect(result.status).toBe(200);
    expect(result.body.member.role).toBe('EDITOR');
    expect('sessionCookie' in result.body).toBe(false);
    expect(result.cookies.includes('__Host-blogpost_session')).toBe(false);
    const cookie = (await session.cookies()).find(
      (value) => value.name === '__Host-blogpost_session',
    )!;
    expect(cookie.secure).toBe(true);
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.sameSite).toBe('Lax');
    expect(cookie.path).toBe('/');
    expect(cookie.domain).toBe('identity-web.blogpost.test');
    await page.goto(runtime.secureOrigin + '/studio');
    await expect(page.getByRole('heading', { name: 'Your staff workspace' })).toBeVisible();
    secureCookiePolicy = {
      name: cookie.name,
      secure: cookie.secure,
      httpOnly: cookie.httpOnly,
      sameSite: cookie.sameSite,
      path: cookie.path,
    };
  } finally {
    await session.close();
  }
});

test('the actual Google SDK emulator popup supports cancellation, memory-only sign-in and warned logout export', async ({
  browser,
}) => {
  const session = await browser.newContext({ baseURL: context.webOrigin });
  observeEmulatorTransport(session);
  try {
    const page = await session.newPage();
    await page.goto('/sign-in');
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
          .analyze()
      ).violations,
    ).toEqual([]);
    const cancelled = page.waitForEvent('popup');
    await page.getByRole('button', { name: 'Continue with Google' }).click();
    const cancelledPopup = await cancelled;
    await cancelledPopup.getByText(fixture('account').email, { exact: true }).waitFor();
    await readyEmulatorPopup(page, cancelledPopup);
    await cancelledPopup.close();
    await expect(page.locator('.auth-panel [role="alert"]')).toContainText(
      'Sign-in was cancelled',
      { timeout: 20_000 },
    );
    let markExchangeReached!: () => void;
    const exchangeReached = new Promise<void>((resolve) => {
      markExchangeReached = resolve;
    });
    let releaseExchange!: () => void;
    const exchangeReleased = new Promise<void>((resolve) => {
      releaseExchange = resolve;
    });
    await session.route('**/api/session', async (route) => {
      if (route.request().method() === 'POST') {
        markExchangeReached();
        await exchangeReleased;
      }
      await route.continue();
    });
    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: 'Continue with Google' }).click();
    const popup = await popupPromise;
    await readyEmulatorPopup(page, popup);
    await popup.getByText(fixture('account').email, { exact: true }).click();
    // Inspect while the SDK is authenticated, before the exchange clears its state.
    await exchangeReached;
    try {
      const persistedIdentity = await page.evaluate(async () => {
        const pattern = /"(?:idToken|refreshToken|stsTokenManager|accessToken)"|firebase:authUser:/;
        if (
          pattern.test(
            [...Object.values(localStorage), ...Object.values(sessionStorage)].join('\n'),
          )
        )
          return true;
        for (const entry of await indexedDB.databases()) {
          if (!entry.name?.toLowerCase().includes('firebase')) continue;
          const database = await new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open(entry.name!);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });
          try {
            for (const store of database.objectStoreNames) {
              const records = await new Promise<unknown[]>((resolve, reject) => {
                const request = database.transaction(store).objectStore(store).getAll();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
              });
              if (pattern.test(JSON.stringify(records))) return true;
            }
          } finally {
            database.close();
          }
        }
        return false;
      });
      expect(persistedIdentity).toBe(false);
    } finally {
      releaseExchange();
    }
    await expect(page.getByRole('heading', { name: 'Your staff workspace' })).toBeVisible({
      timeout: 30_000,
    });
    expect((await session.cookies()).some((cookie) => cookie.name === sessionName)).toBe(true);
    const persistence = await page.evaluate(() =>
      [...Object.values(localStorage), ...Object.values(sessionStorage)].join('\n'),
    );
    expect(persistence).not.toMatch(/"(?:idToken|refreshToken|stsTokenManager)"/);
    const namespace = `blogpost:${context.name}:staff`;
    await page.evaluate(
      ({ namespace, accountId }) => {
        localStorage.setItem('reader-unrelated-key', 'keep');
        localStorage.setItem(
          `${namespace}:recovery`,
          JSON.stringify([
            {
              id: 'test-draft',
              title: 'Synthetic unsynced draft',
              markdown: 'A local-only synthetic draft.',
              accountId,
              unsynced: true,
            },
          ]),
        );
      },
      { namespace, accountId: context.fixture.accounts.author.memberId },
    );
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Keep a copy of your unsynced work' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeFocused();
    expect((await session.cookies()).some((cookie) => cookie.name === sessionName)).toBe(true);
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    const exported = page.waitForEvent('download');
    await dialog.getByRole('button', { name: 'Export Markdown', exact: true }).click();
    expect((await exported).suggestedFilename()).toBe('blogpost-unsynced-drafts.md');
    await dialog.getByRole('button', { name: 'Remove local work and sign out' }).click();
    await expect(page).toHaveURL(context.webOrigin + '/');
    expect(
      (await session.cookies()).some((cookie) => [sessionName, csrfName].includes(cookie.name)),
    ).toBe(false);
    const state = await page.evaluate(
      (namespace) => ({
        localKeys: Object.keys(localStorage).filter((key) => key.startsWith(namespace)),
        sessionKeys: Object.keys(sessionStorage).filter((key) => key.startsWith(namespace)),
        reader: localStorage.getItem('reader-unrelated-key'),
      }),
      namespace,
    );
    expect(state).toEqual({ localKeys: [], sessionKeys: [], reader: 'keep' });
    const resources = emulatorTransport.get(session) ?? [];
    const iframe = resources.find(
      (event) => event.event === 'body' && event.path === '/emulator/auth/iframe',
    );
    const loader = resources.find(
      (event) =>
        event.event === 'body' &&
        event.path === '/js/api.js' &&
        Array.isArray(event.queryKeys) &&
        event.queryKeys.length === 0,
    );
    expect(Number(iframe?.bytes)).toBeGreaterThan(0);
    expect(Number(loader?.bytes)).toBeGreaterThan(0);
    emulatorResources = {
      iframeHtmlBytes: Number(iframe?.bytes),
      googleLoaderBytes: Number(loader?.bytes),
    };
  } finally {
    await session.close();
  }
});

test('failed staff storage clearance leaves the existing session available for recovery', async ({
  browser,
}) => {
  const session = await login(browser);
  try {
    const page = await session.newPage();
    await page.goto('/studio');
    await page.evaluate((namespace) => {
      localStorage.setItem(`${namespace}:test-clearance`, 'synthetic-local-data');
      const remove = Storage.prototype.removeItem;
      Storage.prototype.removeItem = function (key) {
        if (key.startsWith(namespace)) throw new Error('Synthetic clearance failure');
        return remove.call(this, key);
      };
    }, `blogpost:${context.name}:staff`);
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(page.locator('.staff-exit > [role="alert"]')).toContainText(
      'Sign-out could not be confirmed',
    );
    expect((await session.cookies()).some((cookie) => cookie.name === sessionName)).toBe(true);
    expect((await session.request.get('/api/editorial/me')).status()).toBe(200);
  } finally {
    await session.close();
  }
});

test('the actual Google SDK redirect restores invitation and CSRF continuity after a blocked popup', async ({
  browser,
}) => {
  fixture('renew-invitation', 'invitee');
  const invitation = fixture('invitation', 'invitee');
  const account = fixture('account', 'invitee');
  const session = await browser.newContext({ baseURL: context.webOrigin });
  try {
    await session.addInitScript(() => {
      window.open = () => null;
    });
    const captured = await session.request.get(`/invite/${invitation.token}`, { maxRedirects: 0 });
    expect(captured.status()).toBe(303);
    const page = await session.newPage();
    await page.goto('/invite');
    const button = page.getByRole('button', { name: 'Continue with Google' });
    await expect(button).toBeEnabled();
    await button.click();
    await expect(page.locator('.auth-panel [role="alert"]')).toContainText(
      'blocked the sign-in window',
    );
    await page.getByRole('button', { name: 'Continue with a page redirect' }).click();
    await expect(page).toHaveURL(/\/emulator\/auth\/handler/);
    await page.waitForLoadState('load');
    await page.getByText(account.email, { exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Your staff workspace' })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page).toHaveURL(context.webOrigin + '/studio/posts');
    const me = await session.request.get('/api/editorial/me');
    expect(me.status()).toBe(200);
    expect((await me.json()).data.email).toBe(account.email);
    expect((await session.cookies()).some((cookie) => cookie.name.endsWith('_oauth_state'))).toBe(
      false,
    );
    const namespace = `blogpost:${context.name}:staff`;
    expect(
      await page.evaluate(
        (namespace) => sessionStorage.getItem(`${namespace}:oauth-redirect`),
        namespace,
      ),
    ).toBeNull();
  } finally {
    await session.close();
  }
});

test('rotated CSRF during Google sign-in recovers with a fresh context and real popup retry', async ({
  browser,
}) => {
  const session = await browser.newContext({ baseURL: context.webOrigin });
  observeEmulatorTransport(session);
  try {
    const page = await session.newPage();
    await page.goto('/sign-in');
    await expect(page.getByText('Checking sign-in…', { exact: true })).toHaveCount(0);
    await csrf(session.request);
    const first = page.waitForEvent('popup');
    await page.getByRole('button', { name: 'Continue with Google' }).click();
    const firstPopup = await first;
    await readyEmulatorPopup(page, firstPopup);
    const rejectedExchange = authResponse(page, '/api/session');
    await firstPopup.getByText(fixture('account').email, { exact: true }).click();
    const rejected = await rejectedExchange;
    expect(rejected.status()).toBe(403);
    expect((await rejected.json()).error.code).toBe('CSRF_VALIDATION_FAILED');
    await expect(page.locator('.auth-panel [role="alert"]')).toContainText('sign-in check expired');
    const retried = page.waitForEvent('popup');
    await page.getByRole('button', { name: 'Continue with Google' }).click();
    const retryPopup = await retried;
    await readyEmulatorPopup(page, retryPopup);
    const successfulExchange = authResponse(page, '/api/session');
    await retryPopup.getByText(fixture('account').email, { exact: true }).click();
    expect((await successfulExchange).status()).toBe(200);
    await expect(page.getByRole('heading', { name: 'Your staff workspace' })).toBeVisible({
      timeout: 30_000,
    });
  } finally {
    await session.close();
  }
});

test('an invalid redirect return offers a clean restart rather than repeating the callback', async ({
  browser,
}) => {
  const session = await browser.newContext({ baseURL: context.webOrigin });
  try {
    const page = await session.newPage();
    await page.goto('/sign-in?oauth=return');
    const restart = page.getByRole('link', { name: 'Start sign-in again', exact: true });
    await expect(restart).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue with Google' })).toHaveCount(0);
    await restart.click();
    await expect(page).not.toHaveURL(/oauth=return/);
    await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
  } finally {
    await session.close();
  }
});

test('a mismatched Google popup account can switch to the invited account without consuming its link', async ({
  browser,
}) => {
  fixture('renew-invitation', 'target');
  const invitation = fixture('invitation', 'target');
  const invited = fixture('account', 'target');
  const wrong = fixture('account', 'mismatch');
  const session = await browser.newContext({ baseURL: context.webOrigin });
  try {
    expect(
      (await session.request.get(`/invite/${invitation.token}`, { maxRedirects: 0 })).status(),
    ).toBe(303);
    const page = await session.newPage();
    await page.goto('/invite');
    const first = page.waitForEvent('popup');
    await page.getByRole('button', { name: 'Continue with Google' }).click();
    const wrongPopup = await first;
    await readyEmulatorPopup(page, wrongPopup);
    const observations: string[] = [];
    page.on('request', (request) => {
      const path = new URL(request.url()).pathname;
      if (path.startsWith('/api/') || path.endsWith('accounts:signInWithIdp'))
        observations.push(`${request.method()} ${path}`);
    });
    page.on('response', (response) => {
      const path = new URL(response.url()).pathname;
      if (path.startsWith('/api/') || path.endsWith('accounts:signInWithIdp'))
        observations.push(`${response.status()} ${path}`);
    });
    const rejection = authResponse(page, '/api/invitations/accept');
    const closed = wrongPopup.waitForEvent('close', { timeout: 30_000 });
    await wrongPopup.getByText(wrong.email, { exact: true }).click();
    const results = await Promise.allSettled([closed, rejection]);
    if (results.some((result) => result.status === 'rejected'))
      throw new Error(
        `Popup mismatch did not complete: ${JSON.stringify({ closed: wrongPopup.isClosed(), observations })}`,
      );
    expect((await rejection).status()).toBe(403);
    await expect(page.locator('.auth-panel [role="alert"]')).toContainText(
      'invitation has not been used',
    );
    expect(
      fixture('state').invitations.find((value: { id: string }) => value.id === invitation.id)
        .acceptedAt,
    ).toBeNull();
    expect((await session.cookies()).some((cookie) => cookie.name === sessionName)).toBe(false);
    const second = page.waitForEvent('popup');
    await page.getByRole('button', { name: 'Choose another Google account' }).click();
    const correctPopup = await second;
    await readyEmulatorPopup(page, correctPopup);
    const successfulExchange = authResponse(page, '/api/session');
    await correctPopup.getByText(invited.email, { exact: true }).click();
    expect((await successfulExchange).status()).toBe(200);
    await expect(page.getByRole('heading', { name: 'Your staff workspace' })).toBeVisible({
      timeout: 30_000,
    });
    const me = await session.request.get('/api/editorial/me');
    expect(me.status()).toBe(200);
    expect((await me.json()).data.email).toBe(invited.email);
    expect((await session.cookies()).some((cookie) => cookie.name.endsWith('_oauth_state'))).toBe(
      false,
    );
  } finally {
    await session.close();
  }
});
