import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createEditorApi, EditorApiError } from '../../src/features/editor/editor-api';
import type { WorkspacePost, MediaAsset } from '../../src/features/editor/draft-types';
import type { EditorConfiguration } from '../../src/features/editor/editor-contract';

const contract = JSON.parse(
  readFileSync(new URL('../../contracts/openapi-v1.0.0.json', import.meta.url), 'utf8'),
);
type Envelope<T> = {
  statusCode: number;
  traceId: string;
  data: T;
  meta: { contractVersion: string; idempotency: { replayed: boolean; expiresAt: string } | null };
};
function example<T>(path: string, method: string, status: number): Envelope<T> {
  return structuredClone(
    contract.paths[path][method].responses[String(status)].content['application/json'].examples
      .success.value,
  );
}
const created = () => example<WorkspacePost>('/v1/posts', 'post', 201);
const saved = () => example<WorkspacePost>('/v1/posts/{postId}/draft', 'put', 200);
const uploaded = () => example<MediaAsset>('/v1/posts/{postId}/media', 'post', 201);
function response<T>(body: Envelope<T>, extras: Record<string, string> = {}) {
  return Response.json(body, {
    status: body.statusCode,
    headers: {
      'X-Trace-ID': body.traceId,
      'X-API-Contract-Version': body.meta.contractVersion,
      ...(body.data && typeof body.data === 'object' && 'version' in body.data
        ? { 'X-Resource-Version': String(body.data.version) }
        : {}),
      ...extras,
    },
  });
}
const csrf = () =>
  Response.json({ token: 'synthetic-csrf-token', expiresAt: '2026-11-01T01:00:00.000Z' });
const apiFailure = (code: string, status: number) => (error: unknown) =>
  error instanceof EditorApiError && error.code === code && error.status === status;

test('protected create carries exact draft/client identifier, CSRF and stable key on a fixed same-origin path', async () => {
  const fixture = created(),
    calls: { path: string; init?: RequestInit }[] = [],
    key = crypto.randomUUID();
  const api = createEditorApi(async (input, init) => {
    calls.push({ path: String(input), init });
    return String(input) === '/api/csrf' ? csrf() : response(fixture);
  });
  const result = await api.create(
    fixture.data.clientDraftId,
    fixture.data.workingRevision!.content,
    key,
  );
  assert.equal(result.data.id, fixture.data.id);
  assert.equal(result.version, fixture.data.version);
  assert.deepEqual(
    calls.map((c) => c.path),
    ['/api/csrf', '/api/editorial/posts'],
  );
  const request = calls[1].init!,
    headers = new Headers(request.headers);
  assert.equal(request.credentials, 'same-origin');
  assert.equal(request.cache, 'no-store');
  assert.equal(request.redirect, 'error');
  assert.equal(request.method, 'POST');
  assert.equal(headers.get('Idempotency-Key'), key);
  assert.equal(headers.get('X-CSRF-Token'), 'synthetic-csrf-token');
  assert.equal(headers.get('X-Expected-Version'), null);
  assert.equal(headers.get('Authorization'), null);
  assert.deepEqual(JSON.parse(String(request.body)), {
    clientDraftId: fixture.data.clientDraftId,
    draft: fixture.data.workingRevision!.content,
  });
});
test('save has exact expected version and direct editable body; upload owns an independent key without version', async () => {
  const fixture = saved(),
    media = uploaded(),
    key = crypto.randomUUID(),
    uploadKey = crypto.randomUUID(),
    calls: RequestInit[] = [];
  const api = createEditorApi(async (input, init) => {
    if (String(input) === '/api/csrf') return csrf();
    calls.push(init!);
    return String(input).endsWith('/media') ? response(media) : response(fixture);
  });
  const draft = fixture.data.workingRevision!.content;
  await api.save(fixture.data.id, draft, 7, key);
  assert.equal(new Headers(calls[0].headers).get('X-Expected-Version'), '7');
  assert.deepEqual(JSON.parse(String(calls[0].body)), draft);
  await api.upload(
    fixture.data.id,
    new Blob(['source'], { type: 'image/png' }),
    'test.png',
    uploadKey,
  );
  const headers = new Headers(calls[1].headers);
  assert.equal(headers.get('X-Expected-Version'), null);
  assert.equal(headers.get('Idempotency-Key'), uploadKey);
  assert.equal(headers.get('Content-Type'), null);
  assert(calls[1].body instanceof FormData);
  assert.equal((calls[1].body.get('file') as File).name, 'test.png');
});
test('malformed or incompatible success does not become a saved draft', async () => {
  for (const alter of [
    (body: Envelope<WorkspacePost>) => {
      body.data.version++;
    },
    (body: Envelope<WorkspacePost>) => {
      body.meta.idempotency = null;
    },
    (body: Envelope<WorkspacePost>) => {
      body.data.clientDraftId = crypto.randomUUID();
    },
  ]) {
    const body = created(),
      original = structuredClone(body);
    alter(body);
    const api = createEditorApi(async (input) =>
      String(input) === '/api/csrf'
        ? csrf()
        : response(body, { 'X-Resource-Version': String(original.data.version) }),
    );
    await assert.rejects(
      api.create(
        original.data.clientDraftId,
        original.data.workingRevision!.content,
        crypto.randomUUID(),
      ),
      apiFailure('INVALID_API_RESPONSE', 502),
    );
  }
  const body = saved();
  const api = createEditorApi(async () => response(body, { 'X-Trace-ID': 'not-a-trace' }));
  await assert.rejects(api.getPost(body.data.id), apiFailure('INVALID_API_RESPONSE', 502));
});
test('authorized read validates the requested resource identity and never takes arbitrary URLs', async () => {
  const body = saved(),
    paths: string[] = [];
  const api = createEditorApi(async (input) => {
    paths.push(String(input));
    return response(body);
  });
  await assert.rejects(api.getPost(crypto.randomUUID()), apiFailure('INVALID_API_RESPONSE', 502));
  await assert.rejects(api.lookup(crypto.randomUUID()), apiFailure('INVALID_API_RESPONSE', 502));
  assert.throws(
    () => api.getPost('https://external.example/private'),
    apiFailure('INVALID_REQUEST', 400),
  );
  assert.equal(paths.length, 2);
  assert(paths.every((path) => path.startsWith('/api/editorial/posts/')));
});
test('network uncertainty and definitive server failures retain distinct error status, trace, retry and fields', async () => {
  const fixture = created();
  const uncertain = createEditorApi(async (input) => {
    if (String(input) === '/api/csrf') return csrf();
    throw new TypeError('network');
  });
  await assert.rejects(
    uncertain.create(
      fixture.data.clientDraftId,
      fixture.data.workingRevision!.content,
      crypto.randomUUID(),
    ),
    apiFailure('OUTCOME_UNKNOWN', 0),
  );
  const body = JSON.parse(
    readFileSync(
      new URL('../../contracts/fixtures/errors/dependency-unavailable.json', import.meta.url),
      'utf8',
    ),
  );
  const api = createEditorApi(async () => response(body, { 'Retry-After': '5' }));
  await assert.rejects(
    api.getPost(fixture.data.id),
    (error) =>
      error instanceof EditorApiError &&
      error.status === 503 &&
      error.traceId === body.traceId &&
      error.retryAfter === '5' &&
      typeof error.details === 'object',
  );
});
test('editor configuration validates contract limits/version and accepts additive metadata', async () => {
  const meta = example<EditorConfiguration['meta']>('/v1/meta', 'get', 200).data;
  const member = example<EditorConfiguration['member']>('/v1/me', 'get', 200).data;
  const value = { meta, member, categories: [], tags: [], futureCapability: { unused: true } };
  const api = createEditorApi(async (input) => {
    assert.equal(input, '/api/editor-config');
    return Response.json(value);
  });
  assert.equal((await api.getConfig()).member.id, member.id);
  meta.apiMajor = 2 as 1;
  await assert.rejects(api.getConfig(), apiFailure('INVALID_API_RESPONSE', 502));
});
test('upload enforces 5 MiB before sending file bytes and private copy rejects oversized or unsafe image responses', async () => {
  const body = uploaded();
  let uploads = 0;
  const api = createEditorApi(async (input) => {
    if (String(input) === '/api/csrf') return csrf();
    uploads++;
    return response(body);
  });
  await assert.rejects(
    api.upload(
      body.data.postId,
      new Blob([new Uint8Array(5 * 1024 * 1024 + 1)]),
      'large.png',
      crypto.randomUUID(),
    ),
    apiFailure('UPLOAD_TOO_LARGE', 413),
  );
  assert.equal(uploads, 0);
  for (const mime of ['image/svg+xml', 'text/html']) {
    const unsafe = createEditorApi(
      async () =>
        new Response('unsafe', {
          headers: {
            'Content-Type': mime,
            'X-Trace-ID': body.traceId,
            'X-API-Contract-Version': '1.0.0',
          },
        }),
    );
    await assert.rejects(
      unsafe.download(body.data.postId, body.data.id),
      apiFailure('INVALID_API_RESPONSE', 502),
    );
  }
  let path = '';
  const image = createEditorApi(async (input) => {
    path = String(input);
    return new Response(new Uint8Array([1, 2, 3]), {
      headers: {
        'Content-Type': 'image/png',
        'X-Trace-ID': body.traceId,
        'X-API-Contract-Version': '1.0.0',
      },
    });
  });
  const downloaded = await image.download(body.data.postId, body.data.id);
  assert.equal(downloaded.size, 3);
  assert.equal(path, `/api/editorial/posts/${body.data.postId}/media/${body.data.id}/w1600`);
});
