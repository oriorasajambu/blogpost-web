import test from 'node:test';
import assert from 'node:assert/strict';
import type {
  DraftContent,
  DraftStore,
  LocalDraft,
  MediaAsset,
  WorkspacePost,
} from '../../src/features/editor/draft-types';
import {
  createLocalDraft,
  draftFromServer,
  emptyDraftContent,
  validateLocalDraft,
} from '../../src/features/editor/draft-model';
import {
  EditorApiError,
  type EditorApi,
  type EditorResult,
} from '../../src/features/editor/editor-api';
import {
  EditorSyncError,
  replaceMediaReferences,
  resolveDraftConflict,
  syncDraft,
  workflowDraft,
} from '../../src/features/editor/sync-engine';
import {
  compareVersions,
  editorCompatibility,
  validateDraftContent,
  validateWorkspacePost,
} from '../../src/features/editor/editor-contract';
import type { EditorConfiguration } from '../../src/features/editor/editor-contract';

const uid = 'editor-test-uid',
  memberId = '10000000-0000-4000-8000-000000000001',
  postId = '10000000-0000-4000-8000-000000000002';
const account = { uid, memberId },
  now = Date.parse('2026-11-01T00:00:00.000Z');
const options = { appVersion: '0.0.0', now: () => now };
const author = { id: memberId, handle: 'author', displayName: 'Author' };
const content = (markdown = 'A draft'): DraftContent => ({
  ...emptyDraftContent(),
  title: 'Test draft',
  markdown,
});
function post(clientDraftId: string, draft = content(), version = 1): WorkspacePost {
  const revisionId = `20000000-0000-4000-8000-${String(version).padStart(12, '0')}`;
  return {
    id: postId,
    clientDraftId,
    author,
    slug: null,
    publicationState: 'NEVER_PUBLISHED',
    workflowState: 'DRAFT',
    version,
    workingRevisionId: revisionId,
    publishedRevisionId: null,
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
    trashedAt: null,
    purgeAfter: null,
    allowedActions: ['EDIT_DRAFT', 'SUBMIT', 'WITHDRAW_REVIEW'],
    workingRevision: {
      id: revisionId,
      postId,
      number: version,
      createdBy: author,
      creditedAuthor: author,
      createdAt: new Date(now).toISOString(),
      content: structuredClone(draft),
      media: [],
      restoredFromRevisionId: null,
    },
    publishedRevision: null,
    review: { submittedRevisionId: null, submittedAt: null, lastFeedback: null },
  };
}
function asset(id = crypto.randomUUID()): MediaAsset {
  return {
    id,
    postId,
    ready: true,
    width: 20,
    height: 20,
    mimeType: 'image/png',
    variants: (['w480', 'w960', 'w1600'] as const).map((name) => ({
      name,
      apiPath: `/v1/posts/${postId}/media/${id}/${name}`,
      width: 20,
      height: 20,
      byteSize: 100,
      mimeType: 'image/png',
    })),
    createdAt: new Date(now).toISOString(),
    unattachedExpiresAt: new Date(now + 86400000).toISOString(),
  };
}
function result<T>(data: T, replayed = false): EditorResult<T> {
  return {
    data,
    version:
      typeof data === 'object' && data !== null && 'version' in data ? Number(data.version) : null,
    idempotency: { replayed, expiresAt: new Date(now + 86400000).toISOString() },
  };
}
function config(): EditorConfiguration {
  return {
    member: {
      ...author,
      bio: '',
      email: 'author@example.test',
      role: 'AUTHOR',
      active: true,
      version: 1,
    },
    categories: [],
    tags: [],
    meta: {
      apiMajor: 1,
      contractVersion: '1.0.0',
      markdownContractVersion: 1,
      buildSha: 'test',
      features: [],
      limits: {} as EditorConfiguration['meta']['limits'],
      clients: {
        web: { recommendedVersion: '0.0.0', minimumSupportedVersion: null },
        android: { recommendedVersion: '0.0.0', minimumSupportedVersion: null },
      },
      lifecycle: {
        status: 'ACTIVE',
        successorApiMajor: null,
        noticePublishedAt: null,
        deprecatedAt: null,
        sunsetAt: null,
        migrationGuidePath: null,
      },
    },
  };
}
function memoryStore(initial: LocalDraft): DraftStore {
  const records = new Map<string, LocalDraft>([
    [initial.clientDraftId, structuredClone({ ...initial, storageVersion: 1 })],
  ]);
  const clone = (draft: LocalDraft) => structuredClone(draft);
  return {
    databaseName: `test-${crypto.randomUUID()}`,
    account,
    async get(id) {
      return records.has(id) ? clone(records.get(id)!) : null;
    },
    async findByPostId(id) {
      return [...records.values()].find((d) => d.postId === id) ?? null;
    },
    async list() {
      return [...records.values()].map(clone);
    },
    async create(draft) {
      assert(!records.has(draft.clientDraftId));
      const value = validateLocalDraft(
        { ...draft, storageVersion: 1, savedAt: new Date(now).toISOString() },
        account,
      );
      records.set(value.clientDraftId, clone(value));
      return clone(value);
    },
    async update(id, updater, expected) {
      const previous = records.get(id)!;
      assert(previous);
      if (expected?.generation !== undefined)
        assert.equal(previous.generation, expected.generation);
      if (expected?.storageVersion !== undefined)
        assert.equal(previous.storageVersion, expected.storageVersion);
      const draft = validateLocalDraft(
        {
          ...updater(clone(previous)),
          storageVersion: previous.storageVersion + 1,
          savedAt: new Date(now).toISOString(),
        },
        account,
      );
      records.set(id, clone(draft));
      return clone(draft);
    },
    async delete(id) {
      records.delete(id);
    },
    async clear() {
      records.clear();
    },
    close() {},
  };
}
function api(overrides: Partial<EditorApi> = {}): EditorApi {
  const unexpected = async () => {
    throw new Error('Unexpected API operation');
  };
  return {
    getConfig: async () => config(),
    getPost: unexpected,
    lookup: unexpected,
    list: unexpected,
    create: unexpected,
    save: unexpected,
    upload: unexpected,
    media: unexpected,
    download: unexpected,
    workflow: unexpected,
    ...overrides,
  };
}
function existing(markdown = 'Original') {
  const local = createLocalDraft(account, content(markdown));
  return draftFromServer(account, post(local.clientDraftId, local.content));
}
async function edit(store: DraftStore, id: string, markdown: string) {
  return store.update(id, (current) => ({
    ...current,
    generation: current.generation + 1,
    content: content(markdown),
  }));
}
function deferred() {
  let done!: () => void;
  const promise = new Promise<void>((resolve) => {
    done = resolve;
  });
  return { promise, done };
}

test('wire limits count Unicode scalars and UTF-8; future workflow states fail closed', () => {
  assert.equal(validateDraftContent({ ...content(), title: '💬'.repeat(160) }).title.length, 320);
  assert.throws(() => validateDraftContent({ ...content(), title: '💬'.repeat(161) }));
  assert.throws(() => validateDraftContent(content('💬'.repeat(32769))));
  const value = post(crypto.randomUUID());
  assert.throws(() => validateWorkspacePost({ ...value, workflowState: 'FUTURE' }));
  assert.equal(compareVersions('1.0.0-rc.10', '1.0.0-rc.2'), 1);
  assert.equal(compareVersions('1.0.0+build.2', '1.0.0+build.3'), 0);
  const meta = config().meta;
  meta.clients.web.minimumSupportedVersion = '1.0.0';
  assert.match(editorCompatibility(meta, '0.0.0')!, /Update/);
});
test('media replacement preserves code, prose, labels and CommonMark references', () => {
  const from = crypto.randomUUID(),
    to = crypto.randomUUID(),
    uri = `media://${from}`;
  const source = `Literal ${uri}\n\n\`${uri}\`\n\n![${uri}](${uri})\n\n![reference][photo]\n\n[photo]: <${uri}> "caption"\n\n\`\`\`\n![](${uri})\n\`\`\``;
  const rewritten = replaceMediaReferences(content(source), { [from]: to }).markdown;
  assert.match(rewritten, new RegExp(`Literal ${uri}`));
  assert.match(rewritten, new RegExp(`!\\[${uri}\\]\\(media://${to}\\)`));
  assert.match(rewritten, new RegExp(`\\[photo\\]: <media://${to}>`));
  assert(rewritten.endsWith(`![](${uri})\n\`\`\``));
});
test('create persists exact input/key before network and uncertain outcome retries the same operation', async () => {
  const local = createLocalDraft(account, content()),
    store = memoryStore(local);
  let calls = 0,
    firstKey = '',
    firstBody = '';
  const transport = api({
    create: async (id, draft, key) => {
      const saved = await store.get(id);
      assert.equal(saved?.pending?.kind, 'sync');
      assert.equal(saved?.pending?.kind === 'sync' ? saved.pending.create?.key : '', key);
      calls++;
      if (calls === 1) {
        firstKey = key;
        firstBody = JSON.stringify(draft);
        throw new EditorApiError('OUTCOME_UNKNOWN', 0);
      }
      assert.equal(key, firstKey);
      assert.equal(JSON.stringify(draft), firstBody);
      return result(post(id, draft));
    },
  });
  await assert.rejects(
    syncDraft(store, local.clientDraftId, { ...options, api: transport }),
    (error) => error instanceof EditorSyncError && error.code === 'OUTCOME_UNKNOWN',
  );
  const done = await syncDraft(store, local.clientDraftId, { ...options, api: transport });
  assert.equal(done.postId, postId);
  assert.equal(done.pending, null);
  assert.equal(done.syncedGeneration, 0);
  assert.equal(calls, 2);
});
test('typing during sync stays dirty while the captured generation is acknowledged', async () => {
  const local = existing(),
    store = memoryStore(local);
  await edit(store, local.clientDraftId, 'Captured');
  const entered = deferred(),
    release = deferred();
  const running = syncDraft(store, local.clientDraftId, {
    ...options,
    api: api({
      save: async (_id, draft, version) => {
        assert.equal(version, 1);
        entered.done();
        await release.promise;
        assert.equal(draft.markdown, 'Captured');
        return result(post(local.clientDraftId, draft, 2));
      },
    }),
  });
  await entered.promise;
  await edit(store, local.clientDraftId, 'New typing');
  release.done();
  const done = await running;
  assert.equal(done.content.markdown, 'New typing');
  assert.equal(done.generation, 2);
  assert.equal(done.syncedGeneration, 1);
  assert.equal(done.base?.version, 2);
});
test('replayed response refetches and records divergence rather than adopting its stale version', async () => {
  const local = existing(),
    store = memoryStore(local);
  await edit(store, local.clientDraftId, 'Captured');
  let reads = 0;
  const done = await syncDraft(store, local.clientDraftId, {
    ...options,
    api: api({
      save: async (_id, draft) => result(post(local.clientDraftId, draft, 2), true),
      getPost: async () => {
        reads++;
        return result(post(local.clientDraftId, content('Another writer'), 3));
      },
    }),
  });
  assert.equal(reads, 1);
  assert.equal(done.base?.version, 1);
  assert.equal(done.conflict?.server?.version, 3);
  assert.equal(done.conflict?.reason, 'replay-diverged');
  assert.equal(done.content.markdown, 'Captured');
});
test('412 preserves original/server/local snapshots and does not retry at a new version', async () => {
  const local = existing(),
    store = memoryStore(local);
  await edit(store, local.clientDraftId, 'Local');
  let writes = 0;
  const done = await syncDraft(store, local.clientDraftId, {
    ...options,
    api: api({
      save: async () => {
        writes++;
        throw new EditorApiError('VERSION_CONFLICT', 412);
      },
      getPost: async () => result(post(local.clientDraftId, content('Server'), 2)),
    }),
  });
  assert.equal(writes, 1);
  assert.equal(done.conflict?.base?.workingRevision?.content.markdown, 'Original');
  assert.equal(done.conflict?.server?.workingRevision?.content.markdown, 'Server');
  assert.equal(done.conflict?.local.markdown, 'Local');
  assert.equal(done.syncedGeneration, 0);
});
test('expired uncertain create uses authorized lookup and never makes another create', async () => {
  const local = createLocalDraft(account, content()),
    store = memoryStore(local);
  const broken = api({
    create: async () => {
      throw new EditorApiError('OUTCOME_UNKNOWN', 0);
    },
  });
  await assert.rejects(syncDraft(store, local.clientDraftId, { ...options, api: broken }));
  let lookups = 0;
  const done = await syncDraft(store, local.clientDraftId, {
    ...options,
    now: () => now + 86400001,
    api: api({
      lookup: async (id) => {
        lookups++;
        return result(post(id, local.content));
      },
    }),
  });
  assert.equal(lookups, 1);
  assert.equal(done.syncedGeneration, 0);
  assert.equal(done.postId, postId);
});
test('expired create lookup404 requires explicit recovery instead of silent recreation', async () => {
  const local = createLocalDraft(account, content()),
    store = memoryStore(local);
  await assert.rejects(
    syncDraft(store, local.clientDraftId, {
      ...options,
      api: api({
        create: async () => {
          throw new EditorApiError('OUTCOME_UNKNOWN', 0);
        },
      }),
    }),
  );
  const done = await syncDraft(store, local.clientDraftId, {
    ...options,
    now: () => now + 86400001,
    api: api({
      lookup: async () => {
        throw new EditorApiError('RESOURCE_NOT_FOUND', 404);
      },
    }),
  });
  assert.equal(done.conflict?.reason, 'expired-operation');
  assert.equal(done.conflict?.server, null);
  assert.equal(done.postId, null);
});
test('new draft image bootstrap keeps blobs until the referencing revision commits', async () => {
  const localId = crypto.randomUUID(),
    image = asset(),
    local = createLocalDraft(account, content(`![A photo](media://${localId})`));
  local.images = [
    {
      localId,
      blob: new Blob(['image'], { type: 'image/png' }),
      name: 'photo.png',
      altText: 'A photo',
      decorative: false,
      operationKey: crypto.randomUUID(),
      staged: null,
    },
  ];
  const store = memoryStore(local);
  let creates = 0,
    uploads = 0;
  const done = await syncDraft(store, local.clientDraftId, {
    ...options,
    api: api({
      create: async (id, draft) => {
        creates++;
        assert.equal(draft.markdown, '');
        return result(post(id, draft));
      },
      upload: async () => {
        uploads++;
        assert.equal((await store.get(local.clientDraftId))?.images.length, 1);
        return result(image);
      },
      save: async (_id, draft, version) => {
        assert.equal(version, 1);
        assert.equal((await store.get(local.clientDraftId))?.images.length, 1);
        assert.match(draft.markdown, new RegExp(image.id));
        const saved = post(local.clientDraftId, draft, 2);
        saved.workingRevision!.media = [
          {
            mediaId: image.id,
            width: 20,
            height: 20,
            mimeType: image.mimeType,
            variants: image.variants,
          },
        ];
        return result(saved);
      },
    }),
  });
  assert.equal(creates, 1);
  assert.equal(uploads, 1);
  assert.equal(done.images.length, 0);
  assert.equal(done.mediaMappings[localId], image.id);
  assert.equal(done.syncedGeneration, 0);
});
test('expired staging after interrupted save is reuploaded under new keys; current text remains intact', async () => {
  const localId = crypto.randomUUID(),
    oldAsset = asset(),
    newAsset = asset(),
    local = existing();
  local.content = content(`![A photo](media://${localId})`);
  local.generation = 1;
  local.images = [
    {
      localId,
      blob: new Blob(['image'], { type: 'image/png' }),
      name: 'photo.png',
      altText: 'A photo',
      decorative: false,
      operationKey: crypto.randomUUID(),
      staged: null,
    },
  ];
  const store = memoryStore(local);
  let uploads = 0,
    saves = 0;
  const uploadKeys: string[] = [],
    saveKeys: string[] = [];
  const transport = api({
    upload: async (_id, _blob, _name, key) => {
      uploadKeys.push(key);
      return result(++uploads === 1 ? oldAsset : newAsset);
    },
    save: async (_id, draft, _version, key) => {
      saveKeys.push(key);
      saves++;
      if (saves === 1) throw new EditorApiError('OUTCOME_UNKNOWN', 0);
      if (saves === 2) throw new EditorApiError('VALIDATION_FAILED', 422);
      const saved = post(local.clientDraftId, draft, 2);
      saved.workingRevision!.media = [
        {
          mediaId: newAsset.id,
          width: 20,
          height: 20,
          mimeType: newAsset.mimeType,
          variants: newAsset.variants,
        },
      ];
      return result(saved);
    },
    media: async (_post, id) => {
      if (id === oldAsset.id) throw new EditorApiError('RESOURCE_NOT_FOUND', 404);
      return result(newAsset);
    },
  });
  await assert.rejects(syncDraft(store, local.clientDraftId, { ...options, api: transport }));
  assert.equal((await store.get(local.clientDraftId))?.images.length, 1);
  const done = await syncDraft(store, local.clientDraftId, { ...options, api: transport });
  assert.equal(uploads, 2);
  assert.equal(saveKeys[0], saveKeys[1]);
  assert.notEqual(saveKeys[1], saveKeys[2]);
  assert.notEqual(uploadKeys[0], uploadKeys[1]);
  assert.equal(done.images.length, 0);
  assert.match(done.content.markdown, new RegExp(newAsset.id));
});
test('409 WORKFLOW_CONFLICT restages proven missing or expired media while preserving captured input and version', async () => {
  for (const unavailable of ['missing', 'expired']) {
    const localId = crypto.randomUUID(),
      oldAsset = asset(),
      newAsset = asset(),
      local = existing();
    local.content = content(`![A photo](media://${localId})`);
    local.generation = 1;
    local.images = [
      {
        localId,
        blob: new Blob(['preserved image source'], { type: 'image/png' }),
        name: 'photo.png',
        altText: 'A photo',
        decorative: false,
        operationKey: crypto.randomUUID(),
        staged: null,
      },
    ];
    const store = memoryStore(local),
      uploadKeys: string[] = [],
      saves: { key: string; content: DraftContent }[] = [];
    let metadataReads = 0;
    const transport = api({
      upload: async (id, blob, name, key) => {
        assert.equal(id, postId);
        assert.equal(name, 'photo.png');
        assert.equal(await blob.text(), 'preserved image source');
        assert.equal((await store.get(local.clientDraftId))?.images.length, 1);
        uploadKeys.push(key);
        return result(uploadKeys.length === 1 ? oldAsset : newAsset);
      },
      save: async (id, draft, version, key) => {
        assert.equal(id, postId);
        assert.equal(version, 1);
        saves.push({ key, content: structuredClone(draft) });
        if (saves.length === 1 || saves.length === 3)
          throw new EditorApiError('OUTCOME_UNKNOWN', 0);
        if (saves.length === 2) throw new EditorApiError('WORKFLOW_CONFLICT', 409);
        const saved = post(local.clientDraftId, draft, 2);
        saved.workingRevision!.media = [
          {
            mediaId: newAsset.id,
            width: newAsset.width,
            height: newAsset.height,
            mimeType: newAsset.mimeType,
            variants: newAsset.variants,
          },
        ];
        return result(saved);
      },
      media: async (id, mediaId) => {
        assert.equal(id, postId);
        assert.equal(mediaId, oldAsset.id);
        metadataReads++;
        if (unavailable === 'missing') throw new EditorApiError('RESOURCE_NOT_FOUND', 404);
        return result({ ...oldAsset, unattachedExpiresAt: new Date(now - 1).toISOString() });
      },
    });
    const sync = () => syncDraft(store, local.clientDraftId, { ...options, api: transport });
    await assert.rejects(
      sync(),
      (error) => error instanceof EditorSyncError && error.code === 'OUTCOME_UNKNOWN',
    );
    const interrupted = (await store.get(local.clientDraftId))!.pending!;
    assert.equal(interrupted.kind, 'sync');
    await edit(store, local.clientDraftId, `${local.content.markdown}\n\nNew typing`);
    await assert.rejects(
      sync(),
      (error) => error instanceof EditorSyncError && error.code === 'OUTCOME_UNKNOWN',
    );
    const restaged = (await store.get(local.clientDraftId))!.pending!;
    assert.equal(restaged.kind, 'sync');
    if (interrupted.kind !== 'sync' || restaged.kind !== 'sync') throw new Error();
    assert.equal(restaged.id, interrupted.id);
    assert.deepEqual(restaged.capture, interrupted.capture);
    assert.equal(restaged.expectedVersion, 1);
    assert.equal((await store.get(local.clientDraftId))?.images.length, 1);
    const done = await sync();
    assert.equal(uploadKeys.length, 2);
    assert.notEqual(uploadKeys[0], uploadKeys[1]);
    assert.equal(metadataReads, 1);
    assert.deepEqual(saves[0], saves[1]);
    assert.notEqual(saves[1].key, saves[2].key);
    assert.deepEqual(saves[2], saves[3]);
    assert.equal(saves[2].content.markdown, `![A photo](media://${newAsset.id})`);
    assert.equal(done.content.markdown, `![A photo](media://${newAsset.id})\n\nNew typing`);
    assert.equal(done.generation, 2);
    assert.equal(done.syncedGeneration, 1);
    assert.equal(done.base?.version, 2);
    assert.equal(done.images.length, 0);
    assert.equal(done.pending, null);
    assert.equal(done.mediaMappings[localId], newAsset.id);
  }
});
test('409 recovery requires the media-specific code and authenticated proof that staging is unavailable', async () => {
  for (const scenario of ['available', 'other-conflict', 'unauthorized', 'unconfirmed']) {
    const localId = crypto.randomUUID(),
      image = asset(),
      local = existing();
    local.content = content(`![A photo](media://${localId})`);
    local.generation = 1;
    local.images = [
      {
        localId,
        blob: new Blob(['source'], { type: 'image/png' }),
        name: 'photo.png',
        altText: 'A photo',
        decorative: false,
        operationKey: crypto.randomUUID(),
        staged: null,
      },
    ];
    const store = memoryStore(local);
    let uploads = 0,
      saves = 0,
      metadataReads = 0,
      saveKey = '';
    await assert.rejects(
      syncDraft(store, local.clientDraftId, {
        ...options,
        api: api({
          upload: async () => {
            uploads++;
            return result(image);
          },
          save: async (_id, _draft, _version, key) => {
            saves++;
            saveKey = key;
            throw new EditorApiError(
              scenario === 'other-conflict' ? 'OTHER_CONFLICT' : 'WORKFLOW_CONFLICT',
              409,
            );
          },
          media: async () => {
            metadataReads++;
            if (scenario === 'unauthorized') throw new EditorApiError('AUTH_CHANGED', 401);
            if (scenario === 'unconfirmed') throw new EditorApiError('OUTCOME_UNKNOWN', 0);
            return result(image);
          },
        }),
      }),
      (error) =>
        error instanceof EditorSyncError &&
        error.status === (scenario === 'unauthorized' ? 401 : scenario === 'unconfirmed' ? 0 : 409),
    );
    const kept = (await store.get(local.clientDraftId))!;
    assert.equal(uploads, 1);
    assert.equal(saves, 1);
    assert.equal(metadataReads, scenario === 'other-conflict' ? 0 : 1);
    assert.equal(kept.content.markdown, local.content.markdown);
    assert.equal(kept.images.length, 1);
    assert.equal(kept.base?.version, 1);
    assert.equal(kept.syncedGeneration, 0);
    if (scenario === 'unauthorized' || scenario === 'unconfirmed') {
      assert.equal(kept.pending?.kind, 'sync');
      assert.equal(kept.pending?.kind === 'sync' ? kept.pending.save?.key : null, saveKey);
      assert.equal(
        kept.pending?.kind === 'sync' ? kept.pending.save?.content.markdown : null,
        `![A photo](media://${image.id})`,
      );
    } else assert.equal(kept.pending, null);
  }
});
test('401 and403 preserve exact pending operation and local content', async () => {
  for (const status of [401, 403]) {
    const local = existing(),
      store = memoryStore(local);
    await edit(store, local.clientDraftId, 'Keep me');
    await assert.rejects(
      syncDraft(store, local.clientDraftId, {
        ...options,
        api: api({
          save: async () => {
            throw new EditorApiError('AUTH_CHANGED', status);
          },
        }),
      }),
      (error) => error instanceof EditorSyncError && error.status === status,
    );
    const saved = (await store.get(local.clientDraftId))!;
    assert.equal(saved.content.markdown, 'Keep me');
    assert.equal(saved.pending?.kind, 'sync');
    assert.equal(saved.syncedGeneration, 0);
  }
});
test('incompatible client or changed account cannot issue writes', async () => {
  const local = existing(),
    store = memoryStore(local);
  await edit(store, local.clientDraftId, 'Keep me');
  const changed = config();
  changed.member.id = crypto.randomUUID();
  await assert.rejects(
    syncDraft(store, local.clientDraftId, {
      ...options,
      api: api({ getConfig: async () => changed }),
    }),
    (error) => error instanceof EditorSyncError && error.status === 403,
  );
  assert.equal((await store.get(local.clientDraftId))?.pending, null);
  const retired = config();
  retired.meta.lifecycle.status = 'RETIRED';
  await assert.rejects(
    syncDraft(store, local.clientDraftId, {
      ...options,
      api: api({ getConfig: async () => retired }),
    }),
    (error) => error instanceof EditorSyncError && error.code === 'UPDATE_REQUIRED',
  );
});
test('manual combine preserves proposed text and requires review again when the displayed server snapshot advances', async () => {
  const local = existing(),
    store = memoryStore(local);
  await edit(store, local.clientDraftId, 'Local');
  await syncDraft(store, local.clientDraftId, {
    ...options,
    api: api({
      save: async () => {
        throw new EditorApiError('VERSION_CONFLICT', 412);
      },
      getPost: async () => result(post(local.clientDraftId, content('Server'), 2)),
    }),
  });
  const changedAgain = await resolveDraftConflict(
    store,
    local.clientDraftId,
    'combine',
    content('Combined'),
    {
      api: api({
        getPost: async () => result(post(local.clientDraftId, content('New server'), 3)),
      }),
    },
  );
  assert.equal(changedAgain.base?.version, 1);
  assert.equal(changedAgain.conflict?.base?.version, 1);
  assert.equal(changedAgain.conflict?.server?.version, 3);
  assert.equal(changedAgain.conflict?.local.markdown, 'Combined');
  assert.equal(changedAgain.content.markdown, 'Combined');
  assert.equal(changedAgain.pending, null);
  const resolved = await resolveDraftConflict(
    store,
    local.clientDraftId,
    'combine',
    content('Combined after reviewing version3'),
    {
      api: api({
        getPost: async () => result(post(local.clientDraftId, content('New server'), 3)),
      }),
    },
  );
  assert.equal(resolved.base?.version, 3);
  assert.equal(resolved.content.markdown, 'Combined after reviewing version3');
  assert.equal(resolved.conflict, null);
  assert.notEqual(resolved.generation, resolved.syncedGeneration);
  assert.equal(resolved.pending, null);
});

test('replayed or expired create divergence durably maps the discovered server ID before saving conflict snapshots', async () => {
  for (const expired of [false, true]) {
    const local = createLocalDraft(account, content('Local create')),
      store = memoryStore(local);
    const transport = expired
      ? api({
          lookup: async () => result(post(local.clientDraftId, content('Changed after create'), 2)),
        })
      : api({
          create: async (_id, draft) => result(post(local.clientDraftId, draft), true),
          getPost: async () =>
            result(post(local.clientDraftId, content('Changed after create'), 2)),
        });
    if (expired)
      await assert.rejects(
        syncDraft(store, local.clientDraftId, {
          ...options,
          api: api({
            create: async () => {
              throw new EditorApiError('OUTCOME_UNKNOWN', 0);
            },
          }),
        }),
      );
    const outcome = await syncDraft(store, local.clientDraftId, {
      ...options,
      now: () => (expired ? now + 86400001 : now),
      api: transport,
    });
    assert.equal(outcome.postId, postId);
    assert.equal(outcome.clientDraftId, local.clientDraftId);
    assert.equal(outcome.base, null);
    assert.equal(outcome.conflict?.base, null);
    assert.equal(outcome.conflict?.server?.id, postId);
    assert.equal(outcome.content.markdown, 'Local create');
    assert.equal(outcome.syncedGeneration, -1);
    assert.equal(validateLocalDraft(outcome, account).conflict?.server?.version, 2);
  }
});
test('clean refresh invalidates a second tab’s stale local-edit generation before it can overwrite new server text', async () => {
  const local = existing('Old server text'),
    store = memoryStore(local),
    staleGeneration = local.generation;
  const refreshed = await syncDraft(store, local.clientDraftId, {
    ...options,
    api: api({
      getPost: async () => result(post(local.clientDraftId, content('New server text'), 2)),
    }),
  });
  assert.equal(refreshed.generation, staleGeneration + 1);
  assert.equal(refreshed.syncedGeneration, refreshed.generation);
  await assert.rejects(
    store.update(
      local.clientDraftId,
      (draft) => ({
        ...draft,
        content: content('Old server text plus stale typing'),
        generation: staleGeneration + 1,
      }),
      { generation: staleGeneration },
    ),
  );
  assert.equal((await store.get(local.clientDraftId))?.content.markdown, 'New server text');
});
test('pending review is emitted before network and withdrawal preserves unsynced typing made during submit', async () => {
  const local = existing(),
    store = memoryStore(local),
    entered = deferred(),
    release = deferred();
  let pendingEmitted = false;
  const submitting = workflowDraft(store, local.clientDraftId, 'submit', {
    ...options,
    onProgress: (progress) => {
      if (progress.draft.pending?.kind === 'submit') pendingEmitted = true;
    },
    api: api({
      workflow: async () => {
        assert(pendingEmitted);
        entered.done();
        await release.promise;
        const review = post(local.clientDraftId, local.content, 2);
        review.workflowState = 'IN_REVIEW';
        review.allowedActions = ['WITHDRAW_REVIEW'];
        return result(review);
      },
    }),
  });
  await entered.promise;
  await edit(store, local.clientDraftId, 'Typing not in submitted revision');
  release.done();
  const submitted = await submitting;
  assert.equal(submitted.base?.workflowState, 'IN_REVIEW');
  assert.equal(submitted.generation, 1);
  assert.equal(submitted.syncedGeneration, 0);
  const withdrawn = await workflowDraft(store, local.clientDraftId, 'withdraw-review', {
    ...options,
    api: api({
      workflow: async (_id, action, version) => {
        assert.equal(action, 'withdraw-review');
        assert.equal(version, 2);
        return result(post(local.clientDraftId, local.content, 3));
      },
    }),
  });
  assert.equal(withdrawn.content.markdown, 'Typing not in submitted revision');
  assert.equal(withdrawn.base?.workflowState, 'DRAFT');
  assert.equal(withdrawn.generation, 1);
  assert.equal(withdrawn.syncedGeneration, 0);
});
test('save as new draft retains original and converts server media to account-scoped pending blobs', async () => {
  const mediaId = crypto.randomUUID(),
    local = existing(`![A photo](media://${mediaId})`),
    store = memoryStore(local);
  await store.update(local.clientDraftId, (draft) => ({
    ...draft,
    conflict: {
      base: draft.base,
      server: draft.base,
      local: draft.content,
      generation: draft.generation,
      reason: 'version',
      detectedAt: new Date(now).toISOString(),
    },
  }));
  const copy = await resolveDraftConflict(store, local.clientDraftId, 'copy', undefined, {
    api: api({
      download: async (id, imageId) => {
        assert.equal(id, postId);
        assert.equal(imageId, mediaId);
        return new Blob(['source'], { type: 'image/png' });
      },
    }),
  });
  assert.notEqual(copy.clientDraftId, local.clientDraftId);
  assert.equal(copy.postId, null);
  assert.equal(copy.images[0].localId, mediaId);
  assert.equal(copy.images[0].staged, null);
  assert.equal(copy.syncedGeneration, -1);
  assert((await store.get(local.clientDraftId))?.conflict);
});
test('workflow persists revision/version/key and retries exact submit after uncertain response', async () => {
  const local = existing(),
    store = memoryStore(local);
  let calls = 0,
    firstKey = '';
  const transport = api({
    workflow: async (_id, action, version, key, revisionId) => {
      assert.equal(action, 'submit');
      assert.equal(version, 1);
      assert.equal(revisionId, local.base?.workingRevisionId);
      const saved = await store.get(local.clientDraftId);
      assert.equal(saved?.pending?.kind, 'submit');
      calls++;
      if (calls === 1) {
        firstKey = key;
        throw new EditorApiError('OUTCOME_UNKNOWN', 0);
      }
      assert.equal(key, firstKey);
      const submitted = post(local.clientDraftId, local.content, 2);
      submitted.workflowState = 'IN_REVIEW';
      return result(submitted);
    },
  });
  await assert.rejects(
    workflowDraft(store, local.clientDraftId, 'submit', { ...options, api: transport }),
  );
  const done = await workflowDraft(store, local.clientDraftId, 'submit', {
    ...options,
    api: transport,
  });
  assert.equal(done.base?.workflowState, 'IN_REVIEW');
  assert.equal(done.pending, null);
  assert.equal(done.content.markdown, 'Original');
});
test('storage acknowledgment failure prevents all network mutation', async () => {
  const local = createLocalDraft(account, content()),
    store = memoryStore(local);
  store.update = async () => {
    throw new DOMException('Quota', 'QuotaExceededError');
  };
  await assert.rejects(
    syncDraft(store, local.clientDraftId, { ...options, api: api() }),
    (error) => error instanceof DOMException && error.name === 'QuotaExceededError',
  );
});

test('typing during capability check remains newer than the immutable sync capture', async () => {
  const local = existing(),
    store = memoryStore(local);
  await edit(store, local.clientDraftId, 'Captured at click');
  const entered = deferred(),
    release = deferred();
  const running = syncDraft(store, local.clientDraftId, {
    ...options,
    api: api({
      getConfig: async () => {
        entered.done();
        await release.promise;
        return config();
      },
      save: async (_id, draft) => {
        assert.equal(draft.markdown, 'Captured at click');
        return result(post(local.clientDraftId, draft, 2));
      },
    }),
  });
  await entered.promise;
  await edit(store, local.clientDraftId, 'Typed during capability request');
  release.done();
  const done = await running;
  assert.equal(done.content.markdown, 'Typed during capability request');
  assert.equal(done.generation, 2);
  assert.equal(done.syncedGeneration, 1);
});
test('clean explicit Sync refreshes server workflow, while typing during refresh keeps its original base', async () => {
  const local = existing(),
    store = memoryStore(local),
    server = post(local.clientDraftId, content('New server content'), 2);
  server.workflowState = 'IN_REVIEW';
  server.allowedActions = ['WITHDRAW_REVIEW'];
  const refreshed = await syncDraft(store, local.clientDraftId, {
    ...options,
    api: api({ getPost: async () => result(server) }),
  });
  assert.equal(refreshed.base?.workflowState, 'IN_REVIEW');
  assert.equal(refreshed.cleanServerRefresh, true);
  assert.equal(refreshed.content.markdown, 'New server content');
  assert.equal(refreshed.generation, refreshed.syncedGeneration);
  const second = memoryStore(local),
    entered = deferred(),
    release = deferred();
  const running = syncDraft(second, local.clientDraftId, {
    ...options,
    api: api({
      getPost: async () => {
        entered.done();
        await release.promise;
        return result(server);
      },
    }),
  });
  await entered.promise;
  await edit(second, local.clientDraftId, 'Typed while fetching');
  release.done();
  const preserved = await running;
  assert.equal(preserved.content.markdown, 'Typed while fetching');
  assert.equal(preserved.base?.version, 1);
  assert.equal(preserved.generation, 1);
  assert.equal(preserved.syncedGeneration, 0);
  assert.equal(preserved.cleanServerRefresh, true);
});
test('a stale concurrent sync cannot overwrite another tab’s persisted operation phase or key', async () => {
  const local = existing(),
    store = memoryStore(local);
  await edit(store, local.clientDraftId, 'Captured');
  const entered = deferred(),
    release = deferred();
  const running = syncDraft(store, local.clientDraftId, {
    ...options,
    api: api({
      save: async (_id, draft) => {
        entered.done();
        await release.promise;
        return result(post(local.clientDraftId, draft, 2));
      },
    }),
  });
  await entered.promise;
  const newerKey = crypto.randomUUID();
  await store.update(local.clientDraftId, (draft) => {
    assert.equal(draft.pending?.kind, 'sync');
    if (draft.pending?.kind !== 'sync' || !draft.pending.save) throw new Error();
    return {
      ...draft,
      pending: { ...draft.pending, save: { ...draft.pending.save, key: newerKey } },
    };
  });
  release.done();
  await assert.rejects(
    running,
    (error) => error instanceof EditorSyncError && error.code === 'OPERATION_CHANGED',
  );
  const kept = (await store.get(local.clientDraftId))!;
  assert.equal(kept.pending?.kind === 'sync' ? kept.pending.save?.key : null, newerKey);
  assert.equal(kept.syncedGeneration, 0);
});
test('clean refresh commits debounced UI typing before adopting a newer server generation', async () => {
  const local = existing('Original server text'),
    store = memoryStore(local),
    entered = deferred(),
    release = deferred();
  let volatileMarkdown: string | null = null;
  let flushes = 0;
  const running = syncDraft(store, local.clientDraftId, {
    ...options,
    beforeAdoptServer: async () => {
      flushes++;
      if (volatileMarkdown !== null) await edit(store, local.clientDraftId, volatileMarkdown);
    },
    api: api({
      getPost: async () => {
        entered.done();
        await release.promise;
        return result(post(local.clientDraftId, content('New external server text'), 2));
      },
    }),
  });
  await entered.promise;
  // The textarea changed, but its debounce has not committed an IDB transaction.
  volatileMarkdown = 'Typed before the debounce committed';
  assert.equal((await store.get(local.clientDraftId))?.generation, 0);
  release.done();
  const preserved = await running;
  assert.equal(flushes, 1);
  assert.equal(preserved.content.markdown, volatileMarkdown);
  assert.equal(preserved.generation, 1);
  assert.equal(preserved.syncedGeneration, 0);
  assert.equal(preserved.base?.version, 1);
  assert.equal(preserved.pending, null);
  assert.equal(preserved.conflict, null);
});

test('clean refresh does not adopt a server base when the pending device flush fails', async () => {
  const local = existing('Original server text'),
    store = memoryStore(local);
  await assert.rejects(
    syncDraft(store, local.clientDraftId, {
      ...options,
      beforeAdoptServer: async () => {
        throw new DOMException('Synthetic quota failure', 'QuotaExceededError');
      },
      api: api({
        getPost: async () => result(post(local.clientDraftId, content('New server text'), 2)),
      }),
    }),
    (error) => error instanceof DOMException && error.name === 'QuotaExceededError',
  );
  const preserved = (await store.get(local.clientDraftId))!;
  assert.equal(preserved.content.markdown, local.content.markdown);
  assert.equal(preserved.generation, 0);
  assert.equal(preserved.syncedGeneration, 0);
  assert.equal(preserved.base?.version, 1);
});

test('typing while images sync receives committed mappings without discarding newer image sources', async () => {
  const localId = crypto.randomUUID(),
    newLocalId = crypto.randomUUID(),
    image = asset(),
    local = existing();
  local.content = content(`![Photo](media://${localId})`);
  local.generation = 1;
  local.images = [
    {
      localId,
      blob: new Blob(['source'], { type: 'image/png' }),
      name: 'photo.png',
      altText: 'Photo',
      decorative: false,
      operationKey: crypto.randomUUID(),
      staged: null,
    },
  ];
  const store = memoryStore(local),
    entered = deferred(),
    release = deferred();
  const running = syncDraft(store, local.clientDraftId, {
    ...options,
    api: api({
      upload: async () => result(image),
      save: async (_id, draft) => {
        entered.done();
        await release.promise;
        const saved = post(local.clientDraftId, draft, 2);
        saved.workingRevision!.media = [
          {
            mediaId: image.id,
            width: 20,
            height: 20,
            mimeType: image.mimeType,
            variants: image.variants,
          },
        ];
        return result(saved);
      },
    }),
  });
  await entered.promise;
  await store.update(local.clientDraftId, (draft) => ({
    ...draft,
    generation: 2,
    content: content(`${draft.content.markdown}\n\nNew text ![Another](media://${newLocalId})`),
    images: [
      ...draft.images,
      {
        localId: newLocalId,
        blob: new Blob(['new'], { type: 'image/png' }),
        name: 'new.png',
        altText: 'Another',
        decorative: false,
        operationKey: crypto.randomUUID(),
        staged: null,
      },
    ],
  }));
  release.done();
  const done = await running;
  assert.match(done.content.markdown, new RegExp(image.id));
  assert.match(done.content.markdown, new RegExp(newLocalId));
  assert.equal(done.images.length, 1);
  assert.equal(done.images[0].localId, newLocalId);
  assert.equal(done.syncedGeneration, 1);
  assert.equal(done.generation, 2);
  assert.equal(done.mediaMappings[localId], image.id);
});
