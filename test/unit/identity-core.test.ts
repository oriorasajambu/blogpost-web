import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createCsrfToken,
  csrfLifetimeSeconds,
  isSameOriginMutation,
  verifyCsrfToken,
} from '../../src/lib/csrf-policy';
import { parseConfig } from '../../src/lib/config-policy';
import {
  isIdentityToken,
  validateStaffMember,
  validateWebSession,
} from '../../src/lib/auth-contract';
import { editorialOperation, permitsEditorialRole } from '../../src/lib/editorial-policy';
import { staffRequestHeaders } from '../../src/lib/staff-request-policy';

const secret = 'synthetic-csrf-test-secret-32-bytes-minimum';
const clock = Date.parse('2026-10-29T10:00:00.000Z');
const member = {
  id: '40000000-0000-4000-8000-000000000001',
  handle: 'synthetic-staff',
  displayName: 'Synthetic staff',
  bio: '',
  email: 'staff@example.test',
  role: 'AUTHOR',
  active: true,
  version: 1,
};
const cloud = {
  APP_ENV: 'production',
  BACKEND_ORIGIN: 'https://api.example.test',
  WEB_ORIGIN: 'https://journal.example.test',
  WEB_LOGIN_ENABLED: 'true',
  WEB_CSRF_SECRET: secret,
  IDENTITY_WEB_API_KEY: 'synthetic-public-key',
  IDENTITY_AUTH_DOMAIN: 'project.firebaseapp.com',
  IDENTITY_PROJECT_ID: 'project-test',
  IDENTITY_WEB_APP_ID: '1:123:web:synthetic',
};

test('authenticated transport leaves shared visitor context pristine for subsequent public reads', () => {
  const metadata = new Headers({
    'X-Device-ID': member.id,
    'X-Device-OS': 'WEB',
    'X-Device-Version': 'unknown',
    'X-App-Version': '0.0.0',
    'X-App-Language': 'en',
    traceparent: '00-0123456789abcdef0123456789abcdef-0123456789abcdef-00',
  });
  const before = [...metadata];
  const authenticated = staffRequestHeaders(metadata, {
    session: 'server-owned-session',
    contentType: 'application/json',
    headers: new Headers({
      authorization: 'Bearer browser-forged',
      cookie: 'browser=forged',
      'X-Blogpost-Web-Session': 'browser-forged',
      'X-Expected-Version': '7',
      'Idempotency-Key': member.id,
    }),
  });
  assert.deepEqual([...metadata], before);
  assert.equal(authenticated.get('X-Blogpost-Web-Session'), 'server-owned-session');
  assert.equal(authenticated.get('X-Expected-Version'), '7');
  assert.equal(authenticated.has('Authorization'), false);
  assert.equal(authenticated.has('Cookie'), false);
  const subsequentAnonymous = staffRequestHeaders(metadata);
  assert.equal(subsequentAnonymous.has('Authorization'), false);
  assert.equal(subsequentAnonymous.has('X-Blogpost-Web-Session'), false);
  assert.equal(subsequentAnonymous.has('Content-Type'), false);
  const polluted = new Headers(metadata);
  polluted.set('Authorization', 'Bearer stale');
  polluted.set('X-Blogpost-Web-Session', 'stale');
  polluted.set('Cookie', 'unrelated=stale');
  assert.equal(staffRequestHeaders(polluted).has('Authorization'), false);
  assert.equal(staffRequestHeaders(polluted).has('X-Blogpost-Web-Session'), false);
  assert.equal(staffRequestHeaders(polluted).has('Cookie'), false);
  assert.throws(() =>
    staffRequestHeaders(metadata, { session: 'server-session', idToken: 'server-token' }),
  );
});

test('signed CSRF is bound to its cookie, session and short validity interval', () => {
  const { token } = createCsrfToken(secret, 'session-one', clock);
  assert.equal(verifyCsrfToken(token, token, secret, 'session-one', clock), true);
  assert.equal(verifyCsrfToken(token, undefined, secret, 'session-one', clock), false);
  assert.equal(verifyCsrfToken(token, token + 'x', secret, 'session-one', clock), false);
  assert.equal(verifyCsrfToken(token, token, secret, 'session-two', clock), false);
  assert.equal(verifyCsrfToken(token, token, secret + 'x', 'session-one', clock), false);
  assert.equal(
    verifyCsrfToken(token, token, secret, 'session-one', clock + csrfLifetimeSeconds * 1000),
    false,
  );
  assert.equal(verifyCsrfToken(token + 'x', token + 'x', secret, 'session-one', clock), false);
});
test('anonymous CSRF cannot survive a session exchange or authenticate from cross-site origins', () => {
  const { token } = createCsrfToken(secret, undefined, clock);
  assert.equal(verifyCsrfToken(token, token, secret, undefined, clock), true);
  assert.equal(verifyCsrfToken(token, token, secret, 'anonymous', clock), false);
  assert.equal(verifyCsrfToken(token, token, secret, 'new-session', clock), false);
  for (const origin of [
    undefined,
    'null',
    'https://journal.example.test.evil.test',
    'https://journal.example.test:444',
    'http://journal.example.test',
  ]) {
    const headers = new Headers(origin ? { Origin: origin } : {});
    assert.equal(isSameOriginMutation(headers, cloud.WEB_ORIGIN), false);
  }
  assert.equal(
    isSameOriginMutation(new Headers({ Origin: cloud.WEB_ORIGIN }), cloud.WEB_ORIGIN),
    true,
  );
  assert.equal(
    isSameOriginMutation(
      new Headers({ Origin: cloud.WEB_ORIGIN, 'Sec-Fetch-Site': 'cross-site' }),
      cloud.WEB_ORIGIN,
    ),
    false,
  );
});
test('login startup requires exact origin, strong secret and explicit public identity settings', () => {
  const config = parseConfig(cloud);
  assert.equal(config.sessionCookie, '__Host-blogpost_session');
  assert.equal(config.csrfCookie, '__Host-blogpost_csrf');
  assert.equal(config.secureCookies, true);
  assert.deepEqual(config.identity, {
    apiKey: cloud.IDENTITY_WEB_API_KEY,
    authDomain: cloud.IDENTITY_AUTH_DOMAIN,
    projectId: cloud.IDENTITY_PROJECT_ID,
    appId: cloud.IDENTITY_WEB_APP_ID,
  });
  for (const [key, value] of [
    ['WEB_ORIGIN', ''],
    ['WEB_CSRF_SECRET', 'short'],
    ['IDENTITY_WEB_API_KEY', ''],
    ['IDENTITY_AUTH_DOMAIN', 'user@evil.test'],
    ['IDENTITY_AUTH_DOMAIN', 'example.test/path'],
    ['IDENTITY_PROJECT_ID', '../project'],
  ])
    assert.throws(() => parseConfig({ ...cloud, [key]: value }), key);
  assert.throws(
    () => parseConfig({ ...cloud, IDENTITY_AUTH_EMULATOR_ORIGIN: 'http://localhost:9099' }),
    /Development controls/,
  );
});
test('development cookie namespaces and emulator endpoints remain explicitly isolated', () => {
  const local = {
    ...cloud,
    APP_ENV: 'development',
    WEB_ORIGIN: 'http://localhost:3000',
    BACKEND_ORIGIN: 'http://localhost:8080',
    IDENTITY_PROJECT_ID: 'demo-local-identity',
    IDENTITY_AUTH_EMULATOR_ORIGIN: 'http://127.0.0.1:9099',
  };
  const a = parseConfig({ ...local, LOCAL_STACK_ID: 'session-a' });
  const b = parseConfig({ ...local, LOCAL_STACK_ID: 'session-b' });
  assert.notEqual(a.sessionCookie, b.sessionCookie);
  assert.notEqual(a.csrfCookie, b.csrfCookie);
  assert.equal(a.secureCookies, false);
  assert.equal(a.authEmulatorOrigin, local.IDENTITY_AUTH_EMULATOR_ORIGIN);
  assert.throws(
    () => parseConfig({ ...local, IDENTITY_AUTH_EMULATOR_ORIGIN: 'http://api:9099' }),
    /loopback/,
  );
  assert.throws(
    () => parseConfig({ ...local, IDENTITY_PROJECT_ID: 'real-cloud-project' }),
    /demo-/,
  );
  assert.throws(() => parseConfig({ ...cloud, IDENTITY_PROJECT_ID: 'demo-cloud-project' }), /demo/);
  assert.throws(
    () => parseConfig({ ...cloud, IDENTITY_WEB_APP_ID: '123.apps.googleusercontent.com' }),
    /Firebase web app ID/,
  );
});
test('staff DTO selection excludes extra credentials and rejects unsafe role or profile boundaries', () => {
  assert.deepEqual(
    validateStaffMember({
      ...member,
      sessionCookie: 'never-serialize',
      providerToken: 'never-serialize',
    }),
    member,
  );
  for (const patch of [
    { role: 'SUPERADMIN' },
    { active: 'true' },
    { version: 0 },
    { displayName: '\ud83d' },
    { email: 'not-email' },
  ])
    assert.throws(() => validateStaffMember({ ...member, ...patch }));
});
test('session exchange checks expiry and active membership before cookie creation', () => {
  const session = {
    sessionCookie: 'synthetic.session.cookie',
    expiresAt: new Date(clock + 432000000).toISOString(),
    member,
  };
  assert.equal(validateWebSession(session, clock).sessionCookie, session.sessionCookie);
  assert.equal(
    validateWebSession({ ...session, sessionCookie: 'opaque+value/=' }, clock).sessionCookie,
    'opaque+value/=',
  );
  assert.equal(
    validateWebSession({ ...session, sessionCookie: 'a'.repeat(16384) }, clock).sessionCookie
      .length,
    16384,
  );
  assert.throws(() => validateWebSession({ ...session, sessionCookie: 'a'.repeat(16385) }, clock));
  for (const patch of [
    { sessionCookie: 'header\r\ninjection' },
    { expiresAt: new Date(clock).toISOString() },
    { expiresAt: new Date(clock + 432100000).toISOString() },
    { member: { ...member, active: false } },
  ])
    assert.throws(() => validateWebSession({ ...session, ...patch }, clock));
});

test('identity token input accepts the documented wire bound and rejects header-control characters', () => {
  assert.equal(isIdentityToken('a'.repeat(65536)), true);
  for (const value of ['', 'a'.repeat(65537), 'token\r\ninjection', 'token with spaces', '\ud83d'])
    assert.equal(isIdentityToken(value), false);
});
test('editorial transport allowlist excludes arbitrary URLs, identity exchange and unsupported methods', () => {
  const empty = new URLSearchParams();
  assert.equal(editorialOperation('GET', ['me'], empty)?.operationId, 'getMe');
  for (const [method, path] of [
    ['POST', ['auth', 'web-session']],
    ['GET', ['https:', 'evil.test']],
    ['GET', ['posts', '..']],
    ['GET', ['posts', '%2e%2e']],
    ['GET', ['posts', 'id/other']],
    ['DELETE', ['me']],
    ['POST', ['invitations', 'accept']],
  ] as [string, string[]][])
    assert.equal(editorialOperation(method, path, empty), null);
  assert.equal(
    editorialOperation('GET', ['me'], new URLSearchParams('url=https://evil.test')),
    null,
  );
  assert.equal(
    editorialOperation('GET', ['posts'], new URLSearchParams('scope=OWN&scope=ALL')),
    null,
  );
});
test('editorial policy derives mutation guards and permits only documented media variants', () => {
  const id = '10000000-0000-4000-8000-000000000001';
  const save = editorialOperation('PUT', ['posts', id, 'draft'], new URLSearchParams());
  assert.equal(save?.idempotency, true);
  assert.equal(save?.expectedVersion, true);
  const upload = editorialOperation('POST', ['posts', id, 'media'], new URLSearchParams());
  assert.equal(upload?.upload, true);
  assert.equal(upload?.expectedVersion, false);
  assert.equal(
    editorialOperation('GET', ['posts', id, 'media', id, 'w480'], new URLSearchParams())?.binary,
    true,
  );
  assert.equal(
    editorialOperation('GET', ['posts', id, 'media', id, 'original'], new URLSearchParams()),
    null,
  );
  assert.equal(permitsEditorialRole('EDITOR', 'AUTHOR'), false);
  assert.equal(permitsEditorialRole('ADMIN', 'EDITOR'), false);
  assert.equal(permitsEditorialRole('EDITOR', 'ADMIN'), true);
  assert.equal(permitsEditorialRole('UNKNOWN_FUTURE_ACCESS', 'ADMIN'), false);
  assert.equal(permitsEditorialRole(undefined, 'AUTHOR'), false);
});
