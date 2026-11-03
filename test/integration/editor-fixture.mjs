// Runs only inside the disposable editor API container. No credential enters app source.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { DatabaseService } from '../src/platform/database/database.service.js';

const action = process.argv[2];
const input = process.argv[3] ? JSON.parse(process.argv[3]) : {};
const database = new DatabaseService();
const stateFile = '/tmp/web-editor-control.json';
const identity = JSON.parse(await readFile('/tmp/web-identity-fixture.json', 'utf8'));
let state;
try {
  state = JSON.parse(await readFile(stateFile, 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  state = {};
}

const uuid = (value) => {
  assert.match(value, /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/);
  return value;
};
async function token(label) {
  const account = identity.accounts[label];
  assert.ok(account, 'Unknown editor fixture account');
  // Use Google identity, not custom sign-in, to preserve the backend's provider contract.
  const now = Math.floor(Date.now() / 1000);
  const google = [
    Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url'),
    Buffer.from(
      JSON.stringify({
        iss: 'https://accounts.google.com',
        sub: account.subject,
        aud: 'disposable-google-client',
        email: account.email,
        email_verified: true,
        iat: now,
        exp: now + 3600,
      }),
    ).toString('base64url'),
    '',
  ].join('.');
  const response = await fetch(
    'http://auth:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=disposable',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        requestUri: 'http://localhost',
        returnSecureToken: true,
        postBody: new URLSearchParams({ providerId: 'google.com', id_token: google }).toString(),
      }),
      signal: AbortSignal.timeout(10_000),
    },
  );
  assert.equal(response.status, 200);
  return (await response.json()).idToken;
}
async function api(
  path,
  { method = 'GET', data, label = 'author', version, key = randomUUID() } = {},
) {
  const headers = {
    'X-Device-ID': randomUUID(),
    'X-Device-OS': 'UNKNOWN',
    'X-Device-Version': 'unknown',
    'X-App-Version': '0.0.0+web.editor',
    'X-App-Language': 'en',
    authorization: `Bearer ${await token(label)}`,
    'content-type': 'application/json',
    'Idempotency-Key': key,
    ...(version ? { 'X-Expected-Version': String(version) } : {}),
  };
  const response = await fetch(`http://127.0.0.1:8080${path}`, {
    method,
    headers,
    body: data === undefined ? undefined : JSON.stringify(data),
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.json();
  assert.ok(response.ok, `${method} ${path}: ${response.status} ${body.error?.code}`);
  return body.data;
}
const content = (patch = {}) => ({
  title: 'Synthetic editor draft',
  summary: 'A synthetic durable-editor summary.',
  markdown: 'Original base text.',
  categoryId: state.category?.id ?? null,
  tagIds: state.tags?.slice(0, 1).map((tag) => tag.id) ?? [],
  coverMediaId: null,
  markdownContractVersion: 1,
  coverAltText: null,
  coverDecorative: false,
  ...patch,
});
try {
  let result;
  if (action === 'prepare') {
    if (!state.category) {
      state.category = await api('/v1/categories', {
        method: 'POST',
        label: 'admin',
        data: { name: 'Editor integration', slug: `editor-${randomUUID()}` },
      });
      state.tags = [];
      for (const name of ['Durability', 'Recovery', 'Writing', 'Tests', 'Learning', 'Boundary'])
        state.tags.push(
          await api('/v1/tags', {
            method: 'POST',
            label: 'admin',
            data: { name, slug: `editor-${randomUUID()}` },
          }),
        );
      await writeFile(stateFile, JSON.stringify(state), { mode: 0o600 });
    }
    result = { category: state.category, tags: state.tags };
  } else if (action === 'create-post') {
    const draft = content(input.content);
    const label = input.label ?? 'author';
    let post = await api('/v1/posts', {
      method: 'POST',
      label,
      data: { clientDraftId: randomUUID(), draft },
    });
    if (input.published) {
      post = await api(`/v1/posts/${post.id}/submit`, {
        method: 'POST',
        label,
        data: { revisionId: post.workingRevisionId },
        version: post.version,
      });
      post = await api(`/v1/posts/${post.id}/publish`, {
        method: 'POST',
        label: 'editor',
        data: { revisionId: post.workingRevisionId },
        version: post.version,
      });
    }
    result = post;
  } else if (action === 'advance-post') {
    const id = uuid(input.postId),
      label = input.label ?? 'author';
    const post = await api(`/v1/posts/${id}`, { label });
    result = await api(`/v1/posts/${id}/draft`, {
      method: 'PUT',
      label,
      data: { ...post.workingRevision.content, ...input.content },
      version: post.version,
    });
  } else if (action === 'reassign-post') {
    const id = uuid(input.postId);
    const post = await api(`/v1/posts/${id}`, { label: 'admin' });
    const target = identity.accounts[input.label ?? 'other'];
    assert.ok(target?.memberId, 'A seeded target member is required');
    result = await api(`/v1/admin/posts/${id}/author`, {
      method: 'PATCH',
      label: 'admin',
      version: post.version,
      data: { authorId: target.memberId },
    });
  } else if (action === 'post-state') {
    const id = uuid(input.postId);
    const post = await api(`/v1/posts/${id}`, { label: input.label ?? 'author' });
    const media = await database.prisma.mediaAsset.findMany({
      where: { postId: id },
      select: { id: true, state: true, unattachedExpiresAt: true },
    });
    const revisions = await database.prisma.revision.count({ where: { postId: id } });
    const reviews = await database.prisma.reviewEvent.count({ where: { postId: id } });
    result = { post, media, revisions, reviews };
  } else if (action === 'post-count') {
    result = {
      count: await database.prisma.post.count({
        where: input.clientDraftId ? { clientDraftId: uuid(input.clientDraftId) } : {},
      }),
    };
  } else if (action === 'expire-media') {
    const asset = await database.prisma.mediaAsset.findUniqueOrThrow({
      where: { id: uuid(input.mediaId) },
    });
    assert.ok(asset.unattachedExpiresAt, 'Only unattached synthetic staging may expire');
    await database.prisma.mediaAsset.update({
      where: { id: asset.id },
      data: { unattachedExpiresAt: new Date(Date.now() - 1000) },
    });
    result = { expired: true };
  } else if (action === 'expire-replay') {
    const key = uuid(input.key);
    const records = await database.prisma.idempotencyRecord.updateMany({
      where: { key },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    assert.ok(records.count, 'No synthetic operation receipt to expire');
    result = { expired: true };
  } else throw new Error('Unsupported editor fixture action');
  console.log(JSON.stringify(result));
} finally {
  await database.onModuleDestroy();
}
