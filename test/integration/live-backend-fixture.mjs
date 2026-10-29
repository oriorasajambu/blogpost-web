// Executed only inside the disposable backend container by live-backend.mjs.
// Setup creates synthetic identities/taxonomy; all post changes use real HTTP operations.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { DatabaseService } from '../src/platform/database/database.service.js';

const stateFile = '/tmp/web-public-fixture.json';
const metadata = {
  'X-Device-ID': randomUUID(),
  'X-Device-OS': 'UNKNOWN',
  'X-Device-Version': 'unknown',
  'X-App-Version': '0.0.0+web.integration',
  'X-App-Language': 'en',
};
const action = process.argv[2];
const origin = 'http://127.0.0.1:8080';
const database = new DatabaseService();
let state;
async function request(path, method = 'GET', body, token, version) {
  const response = await fetch(origin + path, {
    method,
    headers: {
      ...metadata,
      ...(token ? { authorization: 'Bearer ' + token } : {}),
      ...(method !== 'GET' ? { 'Idempotency-Key': randomUUID() } : {}),
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(version !== undefined ? { 'X-Expected-Version': String(version) } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(20000),
  });
  const decoded = await response.json();
  assert.ok(response.ok, `${method} ${path}: ${response.status} ${decoded.error?.code}`);
  return decoded.data;
}
async function account(role) {
  const subject = randomUUID();
  const email = `web-public-${role.toLowerCase()}-${subject}@example.test`;
  const raw = [
    Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url'),
    Buffer.from(
      JSON.stringify({
        iss: 'https://accounts.google.com',
        sub: subject,
        aud: 'disposable-google-client',
        email,
        email_verified: true,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
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
        postBody: new URLSearchParams({ providerId: 'google.com', id_token: raw }).toString(),
      }),
    },
  );
  assert.equal(response.status, 200);
  const result = await response.json();
  const row = await database.prisma.member.create({
    data: {
      identityUid: result.localId,
      email,
      displayName: `Public ${role === 'AUTHOR' ? 'Author' : 'Editor'}`,
      handle: `web-public-${role.toLowerCase()}`,
      bio: 'A synthetic public profile for local integration checks.',
      role,
    },
  });
  return { id: row.id, handle: row.handle, token: result.idToken };
}
async function publish(post) {
  post = await request(
    `/v1/posts/${post.id}/submit`,
    'POST',
    { revisionId: post.workingRevisionId },
    state.author.token,
    post.version,
  );
  return request(
    `/v1/posts/${post.id}/publish`,
    'POST',
    { revisionId: post.review.submittedRevisionId },
    state.editor.token,
    post.version,
  );
}
function publicState() {
  return {
    postId: state.post.id,
    slug: state.post.slug,
    originalSlug: state.originalSlug,
    mediaId: state.media.id,
    category: state.category,
    tag: state.tag,
    authorId: state.author.id,
    authorHandle: state.author.handle,
    title: state.title,
    summary: state.summary,
    bodyMarker: state.bodyMarker,
    correctionMarker: 'Corrected public observation.',
    draftMarker: 'PRIVATE_UNPUBLISHED_WEB_STAGE_TWO',
    firstPublishedAt: state.firstPublishedAt,
  };
}
try {
  if (action === 'seed') {
    const author = await account('AUTHOR');
    const editor = await account('EDITOR');
    const category = await database.prisma.category.create({
      data: { name: 'Field notes', normalizedName: 'field notes', slug: 'field-notes' },
    });
    const tag = await database.prisma.tag.create({
      data: { name: 'Observation', normalizedName: 'observation', slug: 'observation' },
    });
    state = {
      author,
      editor,
      category: { id: category.id, slug: category.slug },
      tag: { id: tag.id, slug: tag.slug },
      title: 'Patient observation improves everyday learning',
      summary: 'A published field note from the local PostgreSQL integration journey.',
      bodyMarker: 'Published observations reach anonymous readers.',
    };
    state.content = {
      title: state.title,
      summary: state.summary,
      markdown: state.bodyMarker,
      categoryId: category.id,
      tagIds: [tag.id],
      coverMediaId: null,
    };
    let post = await request(
      '/v1/posts',
      'POST',
      { clientDraftId: randomUUID(), draft: state.content },
      author.token,
    );
    const form = new FormData();
    form.set(
      'file',
      new Blob([new Uint8Array(await readFile('contracts/fixtures/media/pixel.png'))], {
        type: 'image/png',
      }),
      'synthetic-pixel.png',
    );
    const upload = await fetch(`${origin}/v1/posts/${post.id}/media`, {
      method: 'POST',
      headers: {
        ...metadata,
        authorization: 'Bearer ' + author.token,
        'Idempotency-Key': randomUUID(),
      },
      body: form,
    });
    const uploaded = await upload.json();
    assert.equal(upload.status, 201, uploaded.error?.code);
    state.media = uploaded.data;
    state.content.markdown += `\n\n![Synthetic integration pixel](media://${state.media.id})\n\n## Observation\n\nA searchable passage about curiosity and careful learning.`;
    post = await request(
      `/v1/posts/${post.id}/draft`,
      'PUT',
      state.content,
      author.token,
      post.version,
    );
    state.post = await publish(post);
    state.originalSlug = state.post.slug;
    state.firstPublishedAt = (await request(`/v1/public/posts/${state.post.id}`)).firstPublishedAt;
    // A never-published sentinel proves feed/search/HTML cannot invent a public draft.
    await request(
      '/v1/posts',
      'POST',
      {
        clientDraftId: randomUUID(),
        draft: {
          ...state.content,
          title: 'PRIVATE_UNPUBLISHED_WEB_STAGE_TWO',
          markdown: 'PRIVATE_UNPUBLISHED_WEB_STAGE_TWO',
          coverMediaId: null,
        },
      },
      author.token,
    );
  } else {
    state = JSON.parse(await readFile(stateFile, 'utf8'));
    state.post = await request(`/v1/posts/${state.post.id}`, 'GET', undefined, state.author.token);
    if (action === 'draft' || action === 'correct') {
      const content = {
        ...state.content,
        markdown:
          state.content.markdown +
          (action === 'draft'
            ? '\n\nPRIVATE_UNPUBLISHED_WEB_STAGE_TWO'
            : '\n\nCorrected public observation.'),
      };
      state.post = await request(
        `/v1/posts/${state.post.id}/draft`,
        'PUT',
        content,
        state.author.token,
        state.post.version,
      );
      if (action === 'correct') {
        state.content = content;
        state.post = await publish(state.post);
      }
    } else if (action === 'rename') {
      state.post = await request(
        `/v1/posts/${state.post.id}/slug`,
        'PATCH',
        { slug: 'patient-observation-canonical' },
        state.editor.token,
        state.post.version,
      );
    } else if (action === 'withdraw') {
      state.post = await request(
        `/v1/posts/${state.post.id}/unpublish`,
        'POST',
        {},
        state.editor.token,
        state.post.version,
      );
    } else throw new Error('Unknown fixture operation');
  }
  await writeFile(stateFile, JSON.stringify(state), { mode: 0o600 });
  console.log(JSON.stringify(publicState()));
} finally {
  await database.onModuleDestroy();
}
