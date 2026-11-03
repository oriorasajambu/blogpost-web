import test from 'node:test';
import assert from 'node:assert/strict';
import {
  captureDraft,
  cloneDraftAsNew,
  conflictFromCleanRefresh,
  createLocalDraft,
  draftFromServer,
  draftRecoveryItems,
  editLocalDraft,
  emptyDraftContent,
  InvalidLocalDraftError,
  isDraftDirty,
  refreshCleanDraft,
  validateLocalDraft,
} from '../../src/features/editor/draft-model';
import {
  DraftStorageError,
  editorDatabaseName,
  openDraftStore,
} from '../../src/features/editor/draft-store';
import type { PendingImage, WorkspacePost } from '../../src/features/editor/draft-types';

const account = { uid: 'firebase-user-one', memberId: '10000000-0000-4000-8000-000000000001' };
const clientDraftId = '20000000-0000-4000-8000-000000000001';
const postId = '30000000-0000-4000-8000-000000000001';
const revisionId = '40000000-0000-4000-8000-000000000001';
const mediaId = '50000000-0000-4000-8000-000000000001';
const timestamp = '2026-11-01T00:00:00.000Z';
function serverPost(): WorkspacePost {
  const author = { id: account.memberId, handle: 'writer', displayName: 'Writer' };
  return {
    id: postId,
    clientDraftId,
    author,
    slug: null,
    publicationState: 'NEVER_PUBLISHED',
    workflowState: 'DRAFT',
    version: 3,
    workingRevisionId: revisionId,
    publishedRevisionId: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    trashedAt: null,
    purgeAfter: null,
    allowedActions: ['EDIT_DRAFT', 'SUBMIT'],
    workingRevision: {
      id: revisionId,
      postId,
      number: 2,
      createdBy: author,
      creditedAuthor: author,
      createdAt: timestamp,
      content: { ...emptyDraftContent(), title: 'Server title', markdown: 'Base body' },
      media: [],
      restoredFromRevisionId: null,
    },
    publishedRevision: null,
    review: { submittedRevisionId: null, submittedAt: null, lastFeedback: null },
  };
}
function pendingImage(): PendingImage {
  return {
    localId: mediaId,
    blob: new Blob(['image bytes'], { type: 'image/png' }),
    name: 'picture.png',
    altText: 'A picture',
    decorative: false,
    operationKey: crypto.randomUUID(),
    staged: null,
  };
}

test('new drafts retain stable temporary identity and remain dirty before a first server commit', () => {
  const draft = createLocalDraft(account, emptyDraftContent(), clientDraftId);
  assert.equal(draft.clientDraftId, clientDraftId);
  assert.equal(draft.storageVersion, 0);
  assert.equal(draft.savedAt, null);
  assert.equal(draft.postId, null);
  assert.equal(draft.syncedGeneration, -1);
  assert.equal(isDraftDirty(draft), true);
});

test('local persistence retains over-limit edits for recovery instead of applying sync limits', () => {
  const content = { ...emptyDraftContent(), title: 'x'.repeat(161), markdown: '🙂'.repeat(40000) };
  const draft = createLocalDraft(account, content);
  assert.equal(validateLocalDraft(draft, account).content.markdown, content.markdown);
  assert.equal(draft.content.title.length, 161);
});

test('editing during an operation preserves its immutable generation, complete base, and image Blob', async () => {
  const draft = draftFromServer(account, serverPost());
  const first = editLocalDraft(
    draft,
    { ...draft.content, markdown: `![A picture](media://${mediaId})` },
    [pendingImage()],
  );
  const captured = captureDraft(first);
  const operation = {
    kind: 'sync' as const,
    id: crypto.randomUUID(),
    createdAt: timestamp,
    capture: captured,
    phase: 'upload' as const,
    postId,
    expectedVersion: 3,
    create: null,
    uploads: [
      { localId: mediaId, key: captured.images[0].operationKey, startedAt: null, asset: null },
    ],
    save: null,
  };
  const second = editLocalDraft(
    { ...first, pending: operation, savedAt: timestamp },
    { ...first.content, title: 'Typed while syncing' },
  );
  assert.equal(second.generation, 2);
  assert.equal(second.savedAt, null);
  assert.equal(second.pending?.kind === 'sync' && second.pending.capture.generation, 1);
  assert.equal(
    second.pending?.kind === 'sync' && second.pending.capture.content.title,
    'Server title',
  );
  assert.equal(second.base?.version, 3);
  assert.equal(second.base?.workingRevision?.content.markdown, 'Base body');
  assert.equal(await captured.images[0].blob.text(), 'image bytes');
  first.content.markdown = 'A later mutable caller value';
  first.images[0].altText = 'Changed';
  assert.equal(captured.content.markdown, `![A picture](media://${mediaId})`);
  assert.equal(captured.images[0].altText, 'A picture');
});

test('server adoption retains both server and temporary IDs and a complete independent snapshot', () => {
  const post = serverPost();
  const draft = draftFromServer(account, post);
  assert.equal(draft.clientDraftId, clientDraftId);
  assert.equal(draft.postId, postId);
  assert.equal(isDraftDirty(draft), false);
  post.workingRevision!.content.title = 'Caller changed';
  assert.equal(draft.content.title, 'Server title');
  assert.equal(draft.base?.workingRevision?.content.title, 'Server title');
});

test('a refreshed clean server snapshot advances local generation so an older tab fails its CAS', () => {
  const original = draftFromServer(account, serverPost());
  const newer = serverPost();
  newer.version++;
  newer.workingRevision!.content.markdown = 'Authoritative newer body';
  const refreshed = refreshCleanDraft(original, newer, () => Date.parse(timestamp));
  assert.equal(refreshed.generation, original.generation + 1);
  assert.equal(refreshed.syncedGeneration, refreshed.generation);
  assert.notEqual(refreshed.generation, original.generation);
  assert.equal(isDraftDirty(refreshed), false);
  assert.equal(refreshed.base?.version, 4);
  assert.equal(refreshed.content.markdown, 'Authoritative newer body');
  assert.equal(refreshed.storageVersion, original.storageVersion);
  assert.equal(refreshed.lastSyncedAt, timestamp);
  assert.equal(original.content.markdown, 'Base body');
});

test('clean refresh includes capability changes and avoids a new generation for an identical base', () => {
  const original = draftFromServer(account, serverPost());
  const same = refreshCleanDraft(original, serverPost());
  assert.equal(same.generation, original.generation);
  const changed = serverPost();
  changed.allowedActions = [];
  assert.equal(refreshCleanDraft(original, changed).generation, original.generation + 1);
  const dirty = editLocalDraft(original, { ...original.content, markdown: 'Keep my edits' });
  assert.throws(() => refreshCleanDraft(dirty, changed), /local changes/);
});

test('a clean refresh colliding with volatile typing preserves the full local copy and original base for review', async () => {
  const original = draftFromServer(account, serverPost());
  const image = pendingImage();
  const local = editLocalDraft(
    original,
    {
      ...original.content,
      title: 'A local title',
      summary: 'A local summary',
      markdown: `Typed before the debounce transaction.\n\n![A picture](media://${image.localId})`,
      coverMediaId: image.localId,
      coverAltText: image.altText,
    },
    [image],
  );
  const post = serverPost();
  post.version++;
  post.workingRevision!.content.markdown = 'An independent server edit.';
  const refreshed = { ...refreshCleanDraft(original, post), storageVersion: 5 };
  assert.equal(
    local.generation,
    refreshed.generation,
    'the race can have identical numeric generations',
  );
  const conflict = conflictFromCleanRefresh(local, refreshed, () => Date.parse(timestamp));
  assert.deepEqual(conflict.content, local.content);
  assert.deepEqual(conflict.base, original.base);
  assert.deepEqual(conflict.conflict?.base, original.base);
  assert.deepEqual(conflict.conflict?.server, post);
  assert.deepEqual(conflict.conflict?.local, local.content);
  assert.equal(await conflict.images[0].blob.text(), 'image bytes');
  assert.equal(await conflict.conflict!.images![0].blob.text(), 'image bytes');
  assert.equal(conflict.generation, refreshed.generation + 1);
  assert.equal(conflict.syncedGeneration, original.syncedGeneration);
  assert.equal(conflict.storageVersion, refreshed.storageVersion);
  assert.equal(conflict.savedAt, null);
  assert.equal(isDraftDirty(conflict), true);
  assert.equal(conflict.clientDraftId, original.clientDraftId);
  assert.equal(conflict.postId, original.postId);
  local.content.title = 'A later caller mutation';
  assert.equal(conflict.content.title, 'A local title');
});

test('refresh collision recovery rejects another account or a dirty server result', () => {
  const original = draftFromServer(account, serverPost());
  assert.throws(() => conflictFromCleanRefresh(original, { ...original, uid: 'another-user' }));
  assert.throws(() =>
    conflictFromCleanRefresh(original, editLocalDraft(original, original.content)),
  );
});

test('durable recovery includes summary text consistently with a loaded editor export', () => {
  const original = createLocalDraft(account, {
    ...emptyDraftContent(),
    title: 'Title',
    summary: 'Summary to recover',
    markdown: 'Body to recover',
  });
  const recovery = draftRecoveryItems([original]);
  assert.equal(recovery[0].title, 'Title');
  assert.equal(recovery[0].markdown, 'Summary to recover\n\nBody to recover');
});

test('pending operations and unresolved conflicts remain recoverable even at an acknowledged generation', () => {
  const draft = draftFromServer(account, serverPost());
  draft.pending = {
    kind: 'submit',
    id: crypto.randomUUID(),
    key: crypto.randomUUID(),
    createdAt: timestamp,
    postId,
    expectedVersion: 3,
    revisionId,
  };
  assert.equal(isDraftDirty(draft), true);
  draft.pending = null;
  draft.conflict = {
    base: draft.base,
    server: serverPost(),
    local: draft.content,
    generation: 0,
    reason: 'version',
    detectedAt: timestamp,
  };
  assert.equal(isDraftDirty(validateLocalDraft(draft)), true);
  const recovery = draftRecoveryItems([draft]);
  assert.equal(recovery[0].accountId, account.memberId);
  assert.equal(recovery[0].unsynced, true);
});

test('corrupt, future-schema, cross-account, and inconsistent identity records are never returned as valid drafts', () => {
  const draft = draftFromServer(account, serverPost());
  for (const change of [
    { schemaVersion: 2 },
    { uid: 'another-user' },
    { memberId: 'another-member' },
    { content: undefined },
    { generation: -1 },
    { syncedGeneration: 1 },
    { clientDraftId: crypto.randomUUID() },
    { postId: null },
    { savedAt: '2026-02-30T00:00:00.000Z' },
    { images: [{ ...pendingImage(), blob: 'not a Blob' }] },
  ])
    assert.throws(
      () => validateLocalDraft({ ...draft, ...change }, account),
      InvalidLocalDraftError,
    );
  assert.throws(
    () => validateLocalDraft({ ...draft, content: { ...draft.content, markdown: '\ud800' } }),
    InvalidLocalDraftError,
  );
});

test('copying local changes as a separate draft resets server, sync, conflict, and upload identities', async () => {
  const original = { ...draftFromServer(account, serverPost()), images: [pendingImage()] };
  const copy = cloneDraftAsNew(original);
  assert.notEqual(copy.clientDraftId, original.clientDraftId);
  assert.equal(copy.postId, null);
  assert.equal(copy.base, null);
  assert.equal(copy.pending, null);
  assert.equal(copy.conflict, null);
  assert.equal(copy.syncedGeneration, -1);
  assert.notEqual(copy.images[0].operationKey, original.images[0].operationKey);
  assert.equal(await copy.images[0].blob.text(), 'image bytes');
  copy.content.title = 'Copy';
  assert.equal(original.content.title, 'Server title');
});

test('database naming stays in staff storage and unavailable IndexedDB rejects visibly', async () => {
  assert.equal(editorDatabaseName('blogpost:test:staff'), 'blogpost:test:staff:editor');
  assert.throws(() => editorDatabaseName('blogpost-theme'), DraftStorageError);
  await assert.rejects(
    openDraftStore('blogpost:test:staff', account),
    (error) => error instanceof DraftStorageError && error.code === 'unavailable',
  );
});
