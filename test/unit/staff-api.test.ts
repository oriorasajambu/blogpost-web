import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createStaffRequest,
  StaffApiError,
  validateStaffPagination,
  notifyStaffAccess,
} from '../../src/features/staff/staff-api';
import { validateStaffMember } from '../../src/lib/auth-contract';
import { validateWorkspaceSummary } from '../../src/features/editor/editor-contract';
import { postFilters, staffPostQuery } from '../../src/features/staff/post-list-policy';

const contract = JSON.parse(
  readFileSync(new URL('../../contracts/openapi-v1.0.0.json', import.meta.url), 'utf8'),
);
const sample = (path: string, method: string, status = 200) =>
  structuredClone(
    contract.paths[path][method].responses[status].content['application/json'].examples.success
      .value,
  );
function response(body: ReturnType<typeof sample>, headers: Record<string, string> = {}) {
  return Response.json(body, {
    status: body.statusCode,
    headers: {
      'X-Trace-ID': body.traceId,
      'X-API-Contract-Version': body.meta.contractVersion,
      ...(body.data?.version ? { 'X-Resource-Version': String(body.data.version) } : {}),
      ...headers,
    },
  });
}
const csrf = () =>
  Response.json({
    token: 'synthetic-csrf',
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
  });
const errorCode = (code: string) => (error: unknown) =>
  error instanceof StaffApiError && error.code === code;

test('staff profile changes send only captured input, exact precondition/key and fresh same-origin CSRF', async () => {
  const fixture = sample('/v1/me', 'patch');
  const key = crypto.randomUUID();
  const calls: { path: string; init?: RequestInit }[] = [];
  const request = createStaffRequest(async (path, init) => {
    calls.push({ path: String(path), init });
    return path === '/api/csrf' ? csrf() : response(fixture);
  });
  const content = { displayName: 'Public staff name', bio: 'Public biography.' };
  await request('/me', validateStaffMember, { method: 'PATCH', content, key, version: 4 });
  assert.deepEqual(
    calls.map((item) => item.path),
    ['/api/csrf', '/api/editorial/me'],
  );
  const headers = new Headers(calls[1].init!.headers);
  assert.equal(headers.get('Idempotency-Key'), key);
  assert.equal(headers.get('X-Expected-Version'), '4');
  assert.equal(headers.get('X-CSRF-Token'), 'synthetic-csrf');
  assert.equal(headers.get('Authorization'), null);
  assert.equal(calls[1].init!.credentials, 'same-origin');
  assert.equal(calls[1].init!.cache, 'no-store');
  assert.equal(calls[1].init!.redirect, 'error');
  assert.deepEqual(JSON.parse(String(calls[1].init!.body)), content);
});
test('staff mutations reject unacknowledged or mismatched resource versions and missing replay metadata', async () => {
  for (const mode of ['version', 'missing-version', 'receipt']) {
    const fixture = sample('/v1/me', 'patch');
    if (mode === 'receipt') fixture.meta.idempotency = null;
    const request = createStaffRequest(async (path) =>
      path === '/api/csrf'
        ? csrf()
        : response(
            fixture,
            mode === 'version'
              ? { 'X-Resource-Version': '99' }
              : mode === 'missing-version'
                ? { 'X-Resource-Version': '' }
                : {},
          ),
    );
    await assert.rejects(
      request('/me', validateStaffMember, {
        method: 'PATCH',
        key: crypto.randomUUID(),
        version: 1,
        content: {},
      }),
      errorCode('INVALID_API_RESPONSE'),
    );
  }
});
test('nested invitation version is checked without accepting an unvalidated secret result', async () => {
  const fixture = sample('/v1/admin/invitations', 'post', 201);
  const request = createStaffRequest(async (path) =>
    path === '/api/csrf'
      ? csrf()
      : response(fixture, { 'X-Resource-Version': String(fixture.data.invitation.version + 1) }),
  );
  await assert.rejects(
    request('/admin/invitations', (value) => value as { invitation: { version: number } }, {
      method: 'POST',
      key: crypto.randomUUID(),
      content: { email: 'synthetic@example.test', role: 'AUTHOR' },
    }),
    errorCode('INVALID_API_RESPONSE'),
  );
});
test('only uncertain mutation transport becomes unknown outcome, while GET failure remains unavailable', async () => {
  const request = createStaffRequest(async (path) => {
    if (path === '/api/csrf') return csrf();
    throw new TypeError('connection lost');
  });
  await assert.rejects(
    request('/posts', (value) => value),
    errorCode('DEPENDENCY_UNAVAILABLE'),
  );
  await assert.rejects(
    request('/me', (value) => value, {
      method: 'PATCH',
      key: crypto.randomUUID(),
      version: 1,
      content: {},
    }),
    errorCode('OUTCOME_UNKNOWN'),
  );
});
test('staff lists require the pinned pagination, bound arrays and diagnostics, and reject forged destinations', async () => {
  const fixture = sample('/v1/posts', 'get');
  const request = createStaffRequest(async () => response(fixture));
  const result = await request('/posts?scope=ALL', (value) => {
    assert(Array.isArray(value));
    return value.map(validateWorkspaceSummary);
  });
  assert.equal(result.pagination?.kind, 'CURSOR');
  for (const path of [
    'https://evil.test/me',
    '//evil.test/me',
    '/posts/../me',
    '/api/session',
    '/me#secret',
    '/me\\admin',
  ])
    await assert.rejects(
      request(path, (value) => value),
      errorCode('INVALID_REQUEST'),
    );
  const bad = createStaffRequest(async () =>
    response(fixture, { 'X-API-Contract-Version': '2.0.0' }),
  );
  await assert.rejects(
    bad('/posts', (value) => value),
    errorCode('INVALID_API_RESPONSE'),
  );
});
test('taxonomy page and article cursor pagination cannot silently become a complete empty result', () => {
  assert.throws(() => validateStaffPagination(undefined));
  assert.throws(() =>
    validateStaffPagination({ kind: 'CURSOR', pageSize: 20, hasMore: true, nextCursor: null }),
  );
  assert.throws(() =>
    validateStaffPagination({
      kind: 'PAGE',
      page: 1,
      pageSize: 20,
      totalItems: 40,
      totalPages: 2,
      hasMore: false,
      truncated: false,
    }),
  );
  assert.deepEqual(
    validateStaffPagination({
      kind: 'PAGE',
      page: 3,
      pageSize: 20,
      totalItems: 40,
      totalPages: 2,
      hasMore: false,
      truncated: false,
    }),
    {
      kind: 'PAGE',
      page: 3,
      pageSize: 20,
      totalItems: 40,
      totalPages: 2,
      hasMore: false,
      truncated: false,
    },
  );
});
test('staff article filters preserve bounded server criteria and never promote arbitrary URL values', () => {
  const filters = postFilters({
    scope: 'ALL',
    publicationState: 'PUBLISHED',
    workflowState: 'IN_REVIEW',
  });
  const query = staffPostQuery(filters, 'opaque cursor + value');
  assert.equal(query.get('scope'), 'ALL');
  assert.equal(query.get('publicationState'), 'PUBLISHED');
  assert.equal(query.get('workflowState'), 'IN_REVIEW');
  assert.equal(query.get('cursor'), 'opaque cursor + value');
  assert.deepEqual(
    postFilters({ scope: ['ALL'], workflowState: 'INVENTED', publicationState: 'ANY' }),
    { scope: 'OWN', workflowState: '', publicationState: '' },
  );
  assert.throws(() => staffPostQuery({ ...filters, workflowState: 'UNKNOWN' }));
});
test('confirmed configuration denial hides staff content while a recoverable CSRF failure keeps the session', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const events: string[] = [];
  const target = new EventTarget();
  for (const name of ['blogpost:staff-access-lost', 'blogpost:staff-session-expired'])
    target.addEventListener(name, () => events.push(name));
  Object.defineProperty(globalThis, 'window', { configurable: true, value: target });
  try {
    notifyStaffAccess({ status: 503 });
    notifyStaffAccess(new StaffApiError('CSRF_VALIDATION_FAILED', 403));
    notifyStaffAccess({ status: 403, code: 'MEMBERSHIP_INACTIVE' });
    notifyStaffAccess({ status: 401, code: 'AUTHENTICATION_REQUIRED' });
    assert.deepEqual(events, ['blogpost:staff-access-lost', 'blogpost:staff-session-expired']);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'window', previous);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});
test('parallel staff panels share bounded request capacity and release it after transport failure', async () => {
  const fixture = sample('/v1/posts', 'get');
  let active = 0;
  let maximum = 0;
  const entered: string[] = [];
  const release: Array<() => void> = [];
  const request = createStaffRequest(async (path) => {
    entered.push(String(path));
    active++;
    maximum = Math.max(maximum, active);
    await new Promise<void>((resolve) => release.push(resolve));
    active--;
    if (String(path).endsWith('failed')) throw new TypeError('Synthetic transport interruption');
    return response(fixture);
  });
  const calls = ['first', 'failed', 'third', 'fourth', 'fifth'].map((cursor) =>
    request(`/posts?cursor=${cursor}`, (value) => value).then(
      () => 'ok',
      (error: unknown) => {
        assert(error instanceof StaffApiError && error.code === 'DEPENDENCY_UNAVAILABLE');
        return 'unavailable';
      },
    ),
  );
  const turn = () => new Promise<void>((resolve) => setImmediate(resolve));
  await turn();
  assert.equal(entered.length, 2);
  while (release.length) {
    release.shift()!();
    await turn();
  }
  assert.deepEqual(await Promise.all(calls), ['ok', 'unavailable', 'ok', 'ok', 'ok']);
  assert.equal(maximum, 2);
  assert.deepEqual(
    entered.map((path) => path.split('=').at(-1)),
    ['first', 'failed', 'third', 'fourth', 'fifth'],
  );
});
