import { editorApi, EditorApiError, type EditorApi, type EditorResult } from './editor-api';
import {
  editorCompatibility,
  validateDraftContent,
  type EditorConfiguration,
} from './editor-contract';
import type {
  DraftContent,
  DraftStore,
  LocalDraft,
  PendingImage,
  PendingOperation,
  PendingSync,
  WorkspacePost,
  WorkflowOperation,
} from './draft-types';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmTable } from 'micromark-extension-gfm-table';
import { gfmTableFromMarkdown } from 'mdast-util-gfm-table';
import { DraftStorageError } from './draft-store';
import { refreshCleanDraft } from './draft-model';

export class EditorSyncError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status?: number,
    public readonly traceId?: string,
    public readonly retryAfter?: string,
  ) {
    super(message);
    this.name = 'EditorSyncError';
  }
}
export type SyncResult = LocalDraft & {
  mediaMappings: Record<string, string>;
  /** A clean-read result may have adopted a new base without committing local typing. */
  cleanServerRefresh?: boolean;
};
export type SyncProgress = {
  phase: 'checking' | 'creating' | 'uploading' | 'saving' | 'complete' | 'conflict';
  draft: LocalDraft;
  /** Only committed revision references appear here; staged uploads keep their source blobs. */
  mediaMappings: Record<string, string>;
};
export type SyncOptions = {
  appVersion: string;
  api?: EditorApi;
  onProgress?: (progress: SyncProgress) => void;
  /** Receives the server configuration each time Sync re-reads and accepts it. */
  onConfiguration?: (configuration: EditorConfiguration) => void;
  /** Commit edits still waiting in the UI before adopting a clean server read. */
  beforeAdoptServer?: () => Promise<void>;
  now?: () => number;
};
const ttl = 24 * 60 * 60 * 1000;
const active = new Map<string, Promise<SyncResult>>();
const timestamp = (options: SyncOptions) => new Date((options.now ?? Date.now)()).toISOString();
const sameContent = (a: DraftContent, b: DraftContent) =>
  JSON.stringify(validateDraftContent(a)) === JSON.stringify(validateDraftContent(b));
const workingContent = (post: WorkspacePost) => post.workingRevision?.content ?? null;

type MarkdownNode = {
  type: string;
  url?: string;
  identifier?: string;
  position?: { start: { offset?: number }; end: { offset?: number } };
  children?: MarkdownNode[];
};
function sourceDestination(raw: string, image: boolean): { start: number; end: number } | null {
  let depth = 1,
    index = image ? 2 : 1;
  for (; index < raw.length; index++) {
    if (raw[index] === '\\') {
      index++;
      continue;
    }
    if (raw[index] === '[') depth++;
    if (raw[index] === ']' && --depth === 0) break;
  }
  if (index >= raw.length || raw[index + 1] !== (image ? '(' : ':')) return null;
  index += 2;
  while (/\s/.test(raw[index] ?? '') && index < raw.length) index++;
  if (raw[index] === '<') {
    const start = ++index;
    for (; index < raw.length; index++) {
      if (raw[index] === '\\') {
        index++;
        continue;
      }
      if (raw[index] === '>') return { start, end: index };
    }
    return null;
  }
  const start = index;
  depth = 0;
  for (; index < raw.length; index++) {
    if (raw[index] === '\\') {
      index++;
      continue;
    }
    if (raw[index] === '(') depth++;
    if (raw[index] === ')') {
      if (depth === 0) break;
      depth--;
    }
    if (/\s/.test(raw[index])) break;
  }
  return { start, end: index };
}
function imageDestinations(markdown: string): { id: string; start: number; end: number }[] {
  const nodes: MarkdownNode[] = [];
  const walk = (node: MarkdownNode) => {
    nodes.push(node);
    node.children?.forEach(walk);
  };
  // Parse exactly as the renderer does (HTML kept as text, tables enabled), so every image a
  // reader would see is found here and its pending upload is synced and rewritten.
  walk(
    fromMarkdown(markdown, {
      extensions: [{ disable: { null: ['htmlFlow', 'htmlText'] } }, gfmTable()],
      mdastExtensions: [gfmTableFromMarkdown()],
    }) as MarkdownNode,
  );
  const referenced = new Set(
    nodes.filter((node) => node.type === 'imageReference').map((node) => node.identifier),
  );
  const destinations: { id: string; start: number; end: number }[] = [];
  for (const node of nodes) {
    if (node.type !== 'image' && !(node.type === 'definition' && referenced.has(node.identifier)))
      continue;
    const match = /^media:\/\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/.exec(
      node.url ?? '',
    );
    if (
      !match ||
      node.position?.start.offset === undefined ||
      node.position.end.offset === undefined
    )
      continue;
    const start = node.position.start.offset,
      end = node.position.end.offset,
      raw = markdown.slice(start, end);
    const destination = sourceDestination(raw, node.type === 'image');
    if (destination)
      destinations.push({
        id: match[1],
        start: start + destination.start,
        end: start + destination.end,
      });
  }
  return destinations;
}
/** Rewrites image destinations only, preserving code, plain text, labels, and formatting. */
export function replaceMediaReferences(
  content: DraftContent,
  mapping: Record<string, string>,
): DraftContent {
  let markdown = content.markdown;
  for (const destination of imageDestinations(markdown).sort((a, b) => b.start - a.start))
    if (mapping[destination.id])
      markdown =
        markdown.slice(0, destination.start) +
        `media://${mapping[destination.id]}` +
        markdown.slice(destination.end);
  return {
    ...content,
    tagIds: [...content.tagIds],
    markdown,
    coverMediaId: content.coverMediaId
      ? (mapping[content.coverMediaId] ?? content.coverMediaId)
      : null,
  };
}
function referencedIds(content: DraftContent): Set<string> {
  const ids = new Set(imageDestinations(content.markdown).map((destination) => destination.id));
  if (content.coverMediaId) ids.add(content.coverMediaId);
  return ids;
}
function errorMessage(error: EditorApiError): string {
  if (error.status === 401)
    return 'Your session expired. Your local work is kept; sign in again before syncing.';
  if (error.status === 403)
    return 'Your access changed. Sync has stopped. Export your local work before clearing this browser.';
  if (error.status === 429)
    return 'The server is busy. Your work is kept; wait before retrying Sync.';
  if (error.code === 'OUTCOME_UNKNOWN' || error.status >= 500)
    return 'The request could not be confirmed. Your work and operation key are kept. Retry Sync to recover its result.';
  if (error.code === 'IDEMPOTENCY_IN_PROGRESS')
    return 'The same operation is still running. Wait, then retry Sync; its key is kept.';
  if (error.code === 'UPLOAD_TOO_LARGE')
    return 'An image exceeds the 5 MiB file limit. Your local source is kept.';
  if (error.code === 'INVALID_API_RESPONSE')
    return 'The server response is incompatible. Local work and recovery information are kept.';
  return `Sync was rejected (${error.code}). Your local work is kept. Review the fields and retry.`;
}
function publicError(error: unknown): never {
  if (error instanceof EditorSyncError) throw error;
  if (error instanceof EditorApiError)
    throw new EditorSyncError(
      error.code,
      errorMessage(error),
      error.status,
      error.traceId,
      error.retryAfter,
    );
  throw error;
}
async function current(store: DraftStore, id: string): Promise<LocalDraft> {
  const draft = await store.get(id);
  if (!draft)
    throw new EditorSyncError(
      'DRAFT_MISSING',
      'This local draft is no longer available. Export any text still visible before leaving.',
    );
  return draft;
}
async function updateOperation(
  store: DraftStore,
  id: string,
  operation: PendingOperation,
  updater: (draft: LocalDraft) => LocalDraft,
) {
  return store.update(id, (draft) => {
    if (JSON.stringify(draft.pending) !== JSON.stringify(operation))
      throw new EditorSyncError(
        'OPERATION_CHANGED',
        'Another tab updated this draft. Reload its saved state before continuing.',
      );
    return updater(draft);
  });
}
async function checkConfiguration(store: DraftStore, api: EditorApi, options: SyncOptions) {
  const config = await api.getConfig();
  if (config.member.id !== store.account.memberId || !config.member.active)
    throw new EditorSyncError(
      'ACCOUNT_CHANGED',
      'The signed-in account changed. Export this account’s local work and sign in again.',
      403,
    );
  const incompatible = editorCompatibility(config.meta, options.appVersion);
  if (incompatible) throw new EditorSyncError('UPDATE_REQUIRED', incompatible);
  options.onConfiguration?.(config);
}
function emit(
  options: SyncOptions,
  phase: SyncProgress['phase'],
  draft: LocalDraft,
  mediaMappings: Record<string, string> = {},
) {
  options.onProgress?.({
    phase,
    draft: structuredClone(draft),
    mediaMappings: { ...mediaMappings },
  });
}
async function conflict(
  store: DraftStore,
  id: string,
  operation: PendingOperation,
  server: WorkspacePost | null,
  reason: 'version' | 'expired-operation' | 'replay-diverged',
  options: SyncOptions,
): Promise<SyncResult> {
  const draft = await updateOperation(store, id, operation, (latest) => ({
    ...latest,
    postId: latest.postId ?? server?.id ?? null,
    pending: null,
    conflict: {
      base: latest.pending?.kind === 'sync' ? latest.pending.capture.base : latest.base,
      server,
      local: structuredClone(latest.content),
      images: structuredClone(latest.images),
      generation: latest.generation,
      reason,
      detectedAt: timestamp(options),
    },
  }));
  emit(options, 'conflict', draft);
  return { ...draft, mediaMappings: {} };
}
async function canonicalResult(
  result: EditorResult<WorkspacePost>,
  api: EditorApi,
): Promise<{ post: WorkspacePost; diverged: boolean }> {
  if (!result.idempotency?.replayed) return { post: result.data, diverged: false };
  const fresh = (await api.getPost(result.data.id)).data;
  return { post: fresh, diverged: fresh.version !== result.data.version };
}
function expired(startedAt: string, expiresAt: string | null, options: SyncOptions): boolean {
  return (
    (options.now ?? Date.now)() >= (expiresAt ? Date.parse(expiresAt) : Date.parse(startedAt) + ttl)
  );
}
function mutationFailureIsDefinite(error: EditorApiError): boolean {
  return (
    [400, 413, 415, 422, 428].includes(error.status) ||
    (error.status === 409 &&
      ![
        'IDEMPOTENCY_IN_PROGRESS',
        'IDEMPOTENCY_KEY_REUSED',
        'CLIENT_DRAFT_ALREADY_EXISTS',
      ].includes(error.code))
  );
}
async function finishSync(
  store: DraftStore,
  id: string,
  operation: PendingSync,
  post: WorkspacePost,
  options: SyncOptions,
): Promise<SyncResult> {
  const mapping: Record<string, string> = {};
  const committed = new Set(post.workingRevision?.media.map((m) => m.mediaId));
  for (const upload of operation.uploads)
    if (upload.asset && committed.has(upload.asset.id)) mapping[upload.localId] = upload.asset.id;
  if (
    post.clientDraftId !== id ||
    !workingContent(post) ||
    !sameContent(workingContent(post)!, replaceMediaReferences(operation.capture.content, mapping))
  )
    throw new EditorApiError('INVALID_API_RESPONSE', 502);
  const draft = await updateOperation(store, id, operation, (latest) => ({
    ...latest,
    postId: post.id,
    base: post,
    content: replaceMediaReferences(latest.content, mapping),
    images: latest.images.filter((image) => !mapping[image.localId]),
    syncedGeneration: operation.capture.generation,
    lastSyncedAt: timestamp(options),
    pending: null,
    conflict: null,
  }));
  emit(options, 'complete', draft, mapping);
  return { ...draft, mediaMappings: mapping };
}
async function doSync(
  store: DraftStore,
  id: string,
  options: SyncOptions,
  restaged = false,
): Promise<SyncResult> {
  const api = options.api ?? editorApi;
  let draft = await current(store, id);
  emit(options, 'checking', draft);
  await checkConfiguration(store, api, options);
  if (draft.conflict) return { ...draft, mediaMappings: {} };
  if (draft.pending && draft.pending.kind !== 'sync')
    throw new EditorSyncError(
      'PENDING_WORKFLOW',
      'Recover the pending review action before syncing more changes.',
    );
  if (!draft.pending) {
    if (draft.postId && draft.generation === draft.syncedGeneration) {
      const post = (await api.getPost(draft.postId)).data;
      if (post.clientDraftId !== id || !workingContent(post))
        throw new EditorApiError('INVALID_API_RESPONSE', 502);
      await options.beforeAdoptServer?.();
      const latest = await current(store, id);
      if (latest.storageVersion !== draft.storageVersion)
        return { ...latest, mediaMappings: {}, cleanServerRefresh: true };
      try {
        draft = await store.update(id, (value) => refreshCleanDraft(value, post, options.now), {
          generation: draft.generation,
          storageVersion: draft.storageVersion,
        });
      } catch (error) {
        if (!(error instanceof DraftStorageError) || error.code !== 'conflict') throw error;
        return { ...(await current(store, id)), mediaMappings: {}, cleanServerRefresh: true };
      }
      // The UI needs the clean-read marker before it considers a newer base. Its
      // volatile edit generation can collide with a refresh committed by another tab.
      return { ...draft, mediaMappings: {}, cleanServerRefresh: true };
    }
    if (draft.base && !draft.base.allowedActions.includes('EDIT_DRAFT'))
      throw new EditorSyncError(
        'EDIT_NOT_ALLOWED',
        'The server does not currently allow editing this post. Withdraw it from review or refresh its state.',
      );
    let content: DraftContent;
    try {
      content = validateDraftContent(draft.content);
    } catch {
      throw new EditorSyncError(
        'INVALID_DRAFT',
        'Check the draft field lengths, tags, Markdown size, and image details before syncing.',
      );
    }
    const ids = referencedIds(content),
      images = draft.images.filter((image) => ids.has(image.localId));
    const createContent = images.length
      ? { ...content, markdown: '', coverMediaId: null, coverAltText: null, coverDecorative: false }
      : content;
    const operation: PendingSync = {
      kind: 'sync',
      id: crypto.randomUUID(),
      createdAt: timestamp(options),
      capture: {
        generation: draft.generation,
        content: structuredClone(content),
        images: structuredClone(images),
        base: structuredClone(draft.base),
      },
      phase: draft.postId ? 'upload' : 'create',
      postId: draft.postId,
      expectedVersion: draft.base?.version ?? null,
      create: draft.postId
        ? null
        : {
            key: crypto.randomUUID(),
            startedAt: timestamp(options),
            content: createContent,
            expiresAt: null,
          },
      uploads: images.map((image) => ({
        localId: image.localId,
        key: image.operationKey,
        startedAt: null,
        asset: image.staged,
      })),
      save: null,
    };
    const capturedDraft = draft;
    draft = await store.update(id, (latest) => {
      if (
        latest.pending ||
        latest.conflict ||
        latest.postId !== capturedDraft.postId ||
        latest.base?.version !== capturedDraft.base?.version
      )
        throw new EditorSyncError(
          'OPERATION_CHANGED',
          'Another tab changed this draft’s server state. Reload its saved state before continuing.',
        );
      return { ...latest, pending: operation };
    });
  }
  let operation = draft.pending as PendingSync;
  try {
    if (operation.phase === 'create') {
      const create = operation.create!;
      emit(options, 'creating', draft);
      let post: WorkspacePost;
      if (expired(create.startedAt, create.expiresAt, options)) {
        try {
          post = (await api.lookup(id)).data;
        } catch (error) {
          if (error instanceof EditorApiError && error.status === 404)
            return conflict(store, id, operation, null, 'expired-operation', options);
          throw error;
        }
        if (!workingContent(post) || !sameContent(workingContent(post)!, create.content))
          return conflict(store, id, operation, post, 'expired-operation', options);
      } else {
        let result: EditorResult<WorkspacePost>;
        try {
          result = await api.create(id, create.content, create.key);
        } catch (error) {
          if (error instanceof EditorApiError && error.code === 'CLIENT_DRAFT_ALREADY_EXISTS') {
            post = (await api.lookup(id)).data;
            return conflict(store, id, operation, post, 'replay-diverged', options);
          }
          throw error;
        }
        const canonical = await canonicalResult(result, api);
        post = canonical.post;
        if (canonical.diverged)
          return conflict(store, id, operation, post, 'replay-diverged', options);
      }
      if (!operation.uploads.length) return finishSync(store, id, operation, post, options);
      draft = await updateOperation(store, id, operation, (latest) => ({
        ...latest,
        postId: post.id,
        base: post,
        pending: { ...operation, phase: 'upload', postId: post.id, expectedVersion: post.version },
      }));
      operation = draft.pending as PendingSync;
    }
    if (!operation.postId || operation.expectedVersion === null)
      throw new EditorSyncError(
        'INVALID_OPERATION',
        'The saved operation is incomplete. Export this draft before recovery.',
      );
    if (operation.phase === 'upload') {
      for (let index = 0; index < operation.uploads.length; index++) {
        let upload = operation.uploads[index];
        const source = operation.capture.images.find((image) => image.localId === upload.localId)!;
        if (upload.asset) {
          let available = false;
          try {
            const asset = (await api.media(operation.postId!, upload.asset.id)).data;
            available =
              !asset.unattachedExpiresAt ||
              Date.parse(asset.unattachedExpiresAt) > (options.now ?? Date.now)();
            if (available) upload = { ...upload, asset };
          } catch (error) {
            if (!(error instanceof EditorApiError) || error.status !== 404) throw error;
          }
          if (!available)
            upload = { ...upload, key: crypto.randomUUID(), startedAt: null, asset: null };
        } else if (upload.startedAt && expired(upload.startedAt, null, options))
          upload = { ...upload, key: crypto.randomUUID(), startedAt: null };
        if (!upload.asset) {
          upload = { ...upload, startedAt: upload.startedAt ?? timestamp(options) };
          const uploads = [...operation.uploads];
          uploads[index] = upload;
          draft = await updateOperation(store, id, operation, (latest) => ({
            ...latest,
            pending: { ...operation, uploads },
          }));
          operation = draft.pending as PendingSync;
          emit(options, 'uploading', draft);
          const result = await api.upload(operation.postId!, source.blob, source.name, upload.key);
          let asset = result.data;
          if (result.idempotency?.replayed) {
            try {
              asset = (await api.media(operation.postId!, asset.id)).data;
            } catch (error) {
              if (!(error instanceof EditorApiError) || error.status !== 404 || restaged)
                throw error;
              const uploads = [...operation.uploads];
              uploads[index] = {
                ...upload,
                key: crypto.randomUUID(),
                startedAt: null,
                asset: null,
              };
              await updateOperation(store, id, operation, (latest) => ({
                ...latest,
                pending: { ...operation, uploads },
              }));
              return doSync(store, id, options, true);
            }
          }
          upload = { ...upload, asset };
        }
        const uploads = [...operation.uploads];
        uploads[index] = upload;
        draft = await updateOperation(store, id, operation, (latest) => ({
          ...latest,
          pending: { ...operation, uploads },
          images: latest.images.map((image) =>
            image.localId === upload.localId ? { ...image, staged: upload.asset } : image,
          ),
        }));
        operation = draft.pending as PendingSync;
      }
      const mapping = Object.fromEntries(
        operation.uploads.map((upload) => [upload.localId, upload.asset!.id]),
      );
      const save = {
        key: crypto.randomUUID(),
        startedAt: timestamp(options),
        content: replaceMediaReferences(operation.capture.content, mapping),
        expiresAt: null,
      };
      draft = await updateOperation(store, id, operation, (latest) => ({
        ...latest,
        pending: { ...operation, phase: 'save', save },
      }));
      operation = draft.pending as PendingSync;
    }
    const save = operation.save!;
    if (expired(save.startedAt, save.expiresAt, options)) {
      const post = (await api.getPost(operation.postId!)).data;
      if (
        workingContent(post) &&
        sameContent(workingContent(post)!, save.content) &&
        post.version === operation.expectedVersion! + 1
      )
        return finishSync(store, id, operation, post, options);
      return conflict(store, id, operation, post, 'expired-operation', options);
    }
    // A staged upload can expire while a save response is unresolved. Retrying this exact
    // save first recovers any committed replay; only a definite media rejection with
    // authenticated metadata proving unavailable staging may re-stage.
    emit(options, 'saving', draft);
    const result = await api.save(
      operation.postId!,
      save.content,
      operation.expectedVersion!,
      save.key,
    );
    const canonical = await canonicalResult(result, api);
    if (canonical.diverged)
      return conflict(store, id, operation, canonical.post, 'replay-diverged', options);
    return finishSync(store, id, operation, canonical.post, options);
  } catch (error) {
    if (error instanceof EditorApiError && error.status === 412) {
      const post = operation.postId ? (await api.getPost(operation.postId)).data : null;
      return conflict(store, id, operation, post, 'version', options);
    }
    if (
      error instanceof EditorApiError &&
      (error.status === 422 || (error.status === 409 && error.code === 'WORKFLOW_CONFLICT')) &&
      operation.phase === 'save' &&
      operation.uploads.length &&
      !restaged
    ) {
      let expiredStaging = false;
      const uploads = structuredClone(operation.uploads);
      for (let index = 0; index < uploads.length; index++) {
        const upload = uploads[index];
        if (!upload.asset) continue;
        let available = true;
        try {
          const asset = (await api.media(operation.postId!, upload.asset.id)).data;
          available =
            !asset.unattachedExpiresAt ||
            Date.parse(asset.unattachedExpiresAt) > (options.now ?? Date.now)();
        } catch (metadataError) {
          if (!(metadataError instanceof EditorApiError) || metadataError.status !== 404)
            throw metadataError;
          available = false;
        }
        if (!available) {
          expiredStaging = true;
          uploads[index] = { ...upload, key: crypto.randomUUID(), startedAt: null, asset: null };
        }
      }
      if (expiredStaging) {
        await updateOperation(store, id, operation, (latest) => ({
          ...latest,
          pending: { ...operation, phase: 'upload', save: null, uploads },
        }));
        return doSync(store, id, options, true);
      }
    }
    if (error instanceof EditorApiError && mutationFailureIsDefinite(error)) {
      // Successful/uncertain writes keep exact input. A proven rejection permits a new
      // explicit operation after the user corrects fields or replaces expired staging.
      await updateOperation(store, id, operation, (latest) => ({ ...latest, pending: null }));
    }
    throw error;
  }
}
function coordinate(
  store: DraftStore,
  id: string,
  work: () => Promise<SyncResult>,
): Promise<SyncResult> {
  const key = `${store.databaseName}:${store.account.uid}:${id}`;
  const existing = active.get(key);
  if (existing) return existing;
  const promise = work()
    .catch(publicError)
    .finally(() => {
      if (active.get(key) === promise) active.delete(key);
    });
  active.set(key, promise);
  return promise;
}
export function syncDraft(
  store: DraftStore,
  id: string,
  options: SyncOptions,
): Promise<SyncResult> {
  return coordinate(store, id, () => doSync(store, id, options));
}

export function workflowDraft(
  store: DraftStore,
  id: string,
  action: 'submit' | 'withdraw-review',
  options: SyncOptions,
): Promise<SyncResult> {
  return coordinate(store, id, async () => {
    const api = options.api ?? editorApi;
    let draft = await current(store, id);
    await checkConfiguration(store, api, options);
    if (draft.conflict)
      throw new EditorSyncError(
        'UNRESOLVED_CONFLICT',
        'Resolve the saved conflict before changing review status.',
      );
    if (draft.pending && draft.pending.kind !== action)
      throw new EditorSyncError(
        'PENDING_OPERATION',
        'Recover the pending operation before changing review status.',
      );
    if (!draft.pending) {
      if (
        !draft.postId ||
        !draft.base ||
        (action === 'submit' && draft.generation !== draft.syncedGeneration)
      )
        throw new EditorSyncError(
          'SYNC_REQUIRED',
          'Sync all local changes before changing review status.',
        );
      if (!draft.base.allowedActions.includes(action === 'submit' ? 'SUBMIT' : 'WITHDRAW_REVIEW'))
        throw new EditorSyncError(
          'ACTION_NOT_ALLOWED',
          'The server does not currently allow this review action.',
        );
      const operation: WorkflowOperation = {
        kind: action,
        id: crypto.randomUUID(),
        key: crypto.randomUUID(),
        createdAt: timestamp(options),
        postId: draft.postId,
        expectedVersion: draft.base.version,
        revisionId: action === 'submit' ? draft.base.workingRevisionId : null,
      };
      draft = await store.update(id, (latest) => ({ ...latest, pending: operation }), {
        generation: draft.generation,
        storageVersion: draft.storageVersion,
      });
    }
    emit(options, 'saving', draft);
    const operation = draft.pending as WorkflowOperation;
    try {
      if (expired(operation.createdAt, null, options))
        return conflict(
          store,
          id,
          operation,
          (await api.getPost(operation.postId)).data,
          'expired-operation',
          options,
        );
      const result = await api.workflow(
        operation.postId,
        action,
        operation.expectedVersion,
        operation.key,
        operation.revisionId,
      );
      const canonical = await canonicalResult(result, api);
      if (canonical.diverged)
        return conflict(store, id, operation, canonical.post, 'replay-diverged', options);
      draft = await updateOperation(store, id, operation, (latest) => ({
        ...latest,
        base: canonical.post,
        pending: null,
      }));
      emit(options, 'complete', draft);
      return { ...draft, mediaMappings: {} };
    } catch (error) {
      if (error instanceof EditorApiError && error.status === 412)
        return conflict(
          store,
          id,
          operation,
          (await api.getPost(operation.postId)).data,
          'version',
          options,
        );
      if (error instanceof EditorApiError && mutationFailureIsDefinite(error))
        await updateOperation(store, id, operation, (latest) => ({ ...latest, pending: null }));
      throw error;
    }
  });
}

/** Each resolution is explicit. Combining adopts a freshly fetched base, never auto-retries. */
async function doResolveConflict(
  store: DraftStore,
  id: string,
  choice: 'server' | 'combine' | 'copy',
  content?: DraftContent,
  options?: { api?: EditorApi },
): Promise<LocalDraft> {
  const api = options?.api ?? editorApi;
  const draft = await current(store, id);
  if (!draft.conflict)
    throw new EditorSyncError(
      'NO_CONFLICT',
      'This conflict has already been resolved. Reload the saved draft.',
    );
  const config = await api.getConfig();
  if (config.member.id !== store.account.memberId || !config.member.active)
    throw new EditorSyncError(
      'ACCOUNT_CHANGED',
      'The signed-in account changed. Export this account’s local work and sign in again.',
      403,
    );
  if (choice === 'copy') {
    const copiedContent = structuredClone(content ?? draft.content);
    const images: PendingImage[] = structuredClone(draft.images).map((image) => ({
      ...image,
      operationKey: crypto.randomUUID(),
      staged: null,
    }));
    for (const mediaId of referencedIds(copiedContent)) {
      if (images.some((image) => image.localId === mediaId)) continue;
      if (!draft.postId)
        throw new EditorSyncError(
          'MISSING_SOURCE',
          'A source image is unavailable. Remove its reference or export the text before making a copy.',
        );
      const blob = await api.download(draft.postId, mediaId);
      images.push({
        localId: mediaId,
        blob,
        name: `recovered-${mediaId}.${blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg'}`,
        altText: copiedContent.coverMediaId === mediaId ? (copiedContent.coverAltText ?? '') : '',
        decorative: copiedContent.coverMediaId === mediaId && copiedContent.coverDecorative,
        operationKey: crypto.randomUUID(),
        staged: null,
      });
    }
    return store.create({
      ...draft,
      clientDraftId: crypto.randomUUID(),
      postId: null,
      content: copiedContent,
      generation: 0,
      syncedGeneration: -1,
      storageVersion: 0,
      savedAt: null,
      lastSyncedAt: null,
      base: null,
      images,
      pending: null,
      conflict: null,
    });
  }
  const postId = draft.conflict.server?.id ?? draft.postId;
  if (!postId)
    throw new EditorSyncError(
      'SERVER_UNAVAILABLE',
      'No server draft was found. Save your local work as a new draft or export it.',
    );
  const post = (await api.getPost(postId)).data;
  const serverContent = workingContent(post);
  if (!serverContent)
    throw new EditorSyncError(
      'SERVER_UNAVAILABLE',
      'The current server revision is unavailable. Export your local work before recovery.',
    );
  if (choice === 'combine' && !content)
    throw new EditorSyncError(
      'COMBINED_CONTENT_REQUIRED',
      'Edit the combined content before accepting it.',
    );
  if (choice === 'combine' && post.version !== draft.conflict.server?.version) {
    // The author combined the displayed server snapshot, not this newer one.
    // Keep their proposed merge durable and ask them to review the latest snapshot.
    return store.update(
      id,
      (latest) => {
        if (!latest.conflict)
          throw new EditorSyncError(
            'OPERATION_CHANGED',
            'Another tab resolved this conflict. Reload its saved state.',
          );
        const generation = latest.generation + 1;
        return {
          ...latest,
          content: structuredClone(content!),
          generation,
          pending: null,
          conflict: {
            ...latest.conflict,
            server: post,
            local: structuredClone(content!),
            generation,
            images: structuredClone(latest.images),
          },
        };
      },
      { generation: draft.generation, storageVersion: draft.storageVersion },
    );
  }
  return store.update(
    id,
    (latest) => {
      if (!latest.conflict)
        throw new EditorSyncError(
          'OPERATION_CHANGED',
          'Another tab resolved this conflict. Reload its saved state.',
        );
      const generation = latest.generation + 1;
      return {
        ...latest,
        postId: post.id,
        base: post,
        content: structuredClone(choice === 'server' ? serverContent : content!),
        generation,
        syncedGeneration: choice === 'server' ? generation : latest.syncedGeneration,
        images: choice === 'server' ? [] : latest.images,
        pending: null,
        conflict: null,
        lastSyncedAt: choice === 'server' ? new Date().toISOString() : latest.lastSyncedAt,
      };
    },
    { generation: draft.generation, storageVersion: draft.storageVersion },
  );
}
export function resolveDraftConflict(
  store: DraftStore,
  id: string,
  choice: 'server' | 'combine' | 'copy',
  content?: DraftContent,
  options?: { api?: EditorApi },
): Promise<LocalDraft> {
  return doResolveConflict(store, id, choice, content, options).catch(publicError);
}
