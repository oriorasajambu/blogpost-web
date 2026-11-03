import type {
  CapturedDraft,
  DraftContent,
  EditorAccount,
  LocalDraft,
  PendingImage,
  WorkspacePost,
} from './draft-types';
import { validateMediaAsset, validateWorkspacePost } from './editor-contract';
import type { RecoveryItem } from '../auth/staff-storage';

const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const datePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
type ValueRecord = Record<string, unknown>;

export class InvalidLocalDraftError extends Error {
  constructor() {
    super('A local draft could not be read safely. Keep this tab open and export your work.');
    this.name = 'InvalidLocalDraftError';
  }
}
function check(condition: unknown): asserts condition {
  if (!condition) throw new InvalidLocalDraftError();
}
function record(value: unknown): ValueRecord {
  check(typeof value === 'object' && value !== null && !Array.isArray(value));
  return value as ValueRecord;
}
function text(value: unknown): string {
  check(typeof value === 'string' && value.isWellFormed());
  return value;
}
function identity(value: unknown): string {
  const result = text(value);
  check(result.length > 0 && result.length <= 256 && !/[\u0000-\u001f\u007f]/.test(result));
  return result;
}
function uuid(value: unknown): string {
  const result = text(value);
  check(uuidPattern.test(result));
  return result;
}
function nullableUuid(value: unknown) {
  return value === null ? null : uuid(value);
}
function integer(value: unknown, minimum = 0): number {
  check(Number.isSafeInteger(value) && Number(value) >= minimum);
  return Number(value);
}
function date(value: unknown): string {
  const result = text(value);
  check(datePattern.test(result) && Number.isFinite(Date.parse(result)));
  check(new Date(result).toISOString() === result);
  return result;
}
function nullableDate(value: unknown) {
  return value === null ? null : date(value);
}
function boolean(value: unknown): boolean {
  check(typeof value === 'boolean');
  return value;
}
function array<T>(value: unknown, validate: (item: unknown) => T): T[] {
  check(Array.isArray(value));
  return value.map(validate);
}

/** Local persistence retains incomplete/over-limit edits; wire validation runs before sync. */
function localContent(value: unknown): DraftContent {
  const v = record(value);
  check(v.markdownContractVersion === 1);
  return {
    title: text(v.title),
    summary: text(v.summary),
    markdown: text(v.markdown),
    categoryId: nullableUuid(v.categoryId),
    tagIds: array(v.tagIds, uuid),
    coverMediaId: nullableUuid(v.coverMediaId),
    markdownContractVersion: 1,
    coverAltText: v.coverAltText === null ? null : text(v.coverAltText),
    coverDecorative: boolean(v.coverDecorative),
  };
}
function images(value: unknown): PendingImage[] {
  const result = array(value, (raw): PendingImage => {
    const v = record(raw);
    check(typeof Blob !== 'undefined' && v.blob instanceof Blob);
    return {
      localId: uuid(v.localId),
      blob: v.blob,
      name: text(v.name),
      altText: text(v.altText),
      decorative: boolean(v.decorative),
      operationKey: uuid(v.operationKey),
      staged: v.staged === null ? null : validateMediaAsset(v.staged),
    };
  });
  check(new Set(result.map((image) => image.localId)).size === result.length);
  return result;
}
function base(value: unknown): WorkspacePost | null {
  return value === null ? null : validateWorkspacePost(value);
}
function capture(value: unknown): CapturedDraft {
  const v = record(value);
  return {
    generation: integer(v.generation),
    content: localContent(v.content),
    images: images(v.images),
    base: base(v.base),
  };
}
function operation(value: unknown): LocalDraft['pending'] {
  if (value === null) return null;
  const v = record(value);
  const id = uuid(v.id);
  const createdAt = date(v.createdAt);
  if (v.kind === 'submit' || v.kind === 'withdraw-review') {
    return {
      kind: v.kind,
      id,
      key: uuid(v.key),
      createdAt,
      postId: uuid(v.postId),
      expectedVersion: integer(v.expectedVersion, 1),
      revisionId: nullableUuid(v.revisionId),
    };
  }
  check(v.kind === 'sync' && ['create', 'upload', 'save'].includes(String(v.phase)));
  function write(raw: unknown) {
    if (raw === null) return null;
    const item = record(raw);
    return {
      key: uuid(item.key),
      startedAt: date(item.startedAt),
      content: localContent(item.content),
      expiresAt: nullableDate(item.expiresAt),
    };
  }
  const uploads = array(v.uploads, (raw) => {
    const item = record(raw);
    return {
      localId: uuid(item.localId),
      key: uuid(item.key),
      startedAt: nullableDate(item.startedAt),
      asset: item.asset === null ? null : validateMediaAsset(item.asset),
    };
  });
  check(new Set(uploads.map((item) => item.localId)).size === uploads.length);
  return {
    kind: 'sync',
    id,
    createdAt,
    capture: capture(v.capture),
    phase: v.phase as 'create' | 'upload' | 'save',
    postId: nullableUuid(v.postId),
    expectedVersion: v.expectedVersion === null ? null : integer(v.expectedVersion, 1),
    create: write(v.create),
    uploads,
    save: write(v.save),
  };
}

/** Select and validate persisted fields before they may enter the editor. */
export function validateLocalDraft(value: unknown, account?: EditorAccount): LocalDraft {
  try {
    const v = record(value);
    check(v.schemaVersion === 1);
    const uid = identity(v.uid);
    const memberId = identity(v.memberId);
    check(!account || (uid === account.uid && memberId === account.memberId));
    const generation = integer(v.generation);
    const syncedGeneration = integer(v.syncedGeneration, -1);
    check(syncedGeneration <= generation);
    const postId = nullableUuid(v.postId);
    const snapshot = base(v.base);
    const clientDraftId = uuid(v.clientDraftId);
    check(!snapshot || (snapshot.id === postId && snapshot.clientDraftId === clientDraftId));
    const pending = operation(v.pending);
    check(
      !pending ||
        (pending.kind !== 'sync'
          ? pending.postId === postId
          : pending.capture.generation <= generation &&
            (pending.postId === null || pending.postId === postId) &&
            (!pending.capture.base ||
              (pending.capture.base.id === postId &&
                pending.capture.base.clientDraftId === clientDraftId))),
    );
    let conflict: LocalDraft['conflict'] = null;
    if (v.conflict !== null) {
      const c = record(v.conflict);
      check(['version', 'expired-operation', 'replay-diverged'].includes(String(c.reason)));
      conflict = {
        base: base(c.base),
        server: base(c.server),
        local: localContent(c.local),
        generation: integer(c.generation),
        reason: c.reason as 'version' | 'expired-operation' | 'replay-diverged',
        detectedAt: date(c.detectedAt),
        ...(c.images === undefined ? {} : { images: images(c.images) }),
      };
      check(conflict.generation <= generation);
      check(
        [conflict.base, conflict.server].every(
          (snapshot) =>
            !snapshot || (snapshot.id === postId && snapshot.clientDraftId === clientDraftId),
        ),
      );
    }
    return {
      schemaVersion: 1,
      uid,
      memberId,
      clientDraftId,
      postId,
      content: localContent(v.content),
      generation,
      syncedGeneration,
      storageVersion: integer(v.storageVersion),
      savedAt: nullableDate(v.savedAt),
      lastSyncedAt: nullableDate(v.lastSyncedAt),
      base: snapshot,
      images: images(v.images),
      pending,
      conflict,
    };
  } catch {
    throw new InvalidLocalDraftError();
  }
}

export function emptyDraftContent(): DraftContent {
  return {
    title: '',
    summary: '',
    markdown: '',
    categoryId: null,
    tagIds: [],
    coverMediaId: null,
    markdownContractVersion: 1,
    coverAltText: null,
    coverDecorative: false,
  };
}
export function createLocalDraft(
  account: EditorAccount,
  content = emptyDraftContent(),
  clientDraftId = crypto.randomUUID(),
): LocalDraft {
  return validateLocalDraft(
    {
      schemaVersion: 1,
      ...account,
      clientDraftId,
      postId: null,
      content,
      generation: 0,
      syncedGeneration: -1,
      storageVersion: 0,
      savedAt: null,
      lastSyncedAt: null,
      base: null,
      images: [],
      pending: null,
      conflict: null,
    },
    account,
  );
}
export function draftFromServer(account: EditorAccount, value: WorkspacePost): LocalDraft {
  const post = validateWorkspacePost(value);
  return validateLocalDraft(
    {
      ...createLocalDraft(
        account,
        post.workingRevision?.content ?? emptyDraftContent(),
        post.clientDraftId,
      ),
      postId: post.id,
      base: post,
      syncedGeneration: 0,
      lastSyncedAt: new Date().toISOString(),
    },
    account,
  );
}
/** A new authoritative base is a new local generation, even without local typing. */
export function refreshCleanDraft(
  draft: LocalDraft,
  value: WorkspacePost,
  now: () => number = Date.now,
): LocalDraft {
  if (isDraftDirty(draft))
    throw new Error('Sync or resolve local changes before refreshing the server copy.');
  const post = validateWorkspacePost(value);
  const content = post.workingRevision?.content ?? emptyDraftContent();
  const changed =
    JSON.stringify(draft.base) !== JSON.stringify(post) ||
    JSON.stringify(draft.content) !== JSON.stringify(content);
  const generation = draft.generation + (changed ? 1 : 0);
  return validateLocalDraft(
    {
      ...draft,
      base: post,
      content,
      generation,
      syncedGeneration: generation,
      lastSyncedAt: new Date(now()).toISOString(),
    },
    draft,
  );
}
/** A refresh racing unsaved typing needs review, rather than adopting an unseen base. */
export function conflictFromCleanRefresh(
  local: LocalDraft,
  refreshed: LocalDraft,
  now: () => number = Date.now,
): LocalDraft {
  if (
    !refreshed.base ||
    isDraftDirty(refreshed) ||
    local.uid !== refreshed.uid ||
    local.memberId !== refreshed.memberId ||
    local.clientDraftId !== refreshed.clientDraftId ||
    local.postId !== refreshed.postId
  )
    throw new Error('The server refresh cannot be combined with this device draft.');
  const generation = Math.max(local.generation, refreshed.generation) + 1;
  return validateLocalDraft(
    {
      ...local,
      generation,
      storageVersion: refreshed.storageVersion,
      savedAt: null,
      pending: null,
      conflict: {
        base: local.base,
        server: refreshed.base,
        local: local.content,
        images: local.images,
        generation,
        reason: 'version',
        detectedAt: new Date(now()).toISOString(),
      },
    },
    local,
  );
}
export function editLocalDraft(
  draft: LocalDraft,
  content: DraftContent,
  pendingImages = draft.images,
): LocalDraft {
  return validateLocalDraft(
    {
      ...draft,
      content,
      images: pendingImages,
      generation: draft.generation + 1,
      savedAt: null,
    },
    draft,
  );
}
export function isDraftDirty(draft: LocalDraft): boolean {
  return (
    draft.generation !== draft.syncedGeneration || draft.pending !== null || draft.conflict !== null
  );
}
export function draftRecoveryItem(draft: LocalDraft): RecoveryItem {
  return {
    id: draft.clientDraftId,
    title: draft.content.title,
    markdown: `${draft.content.summary ? `${draft.content.summary}\n\n` : ''}${draft.content.markdown}`,
    accountId: draft.memberId,
    unsynced: isDraftDirty(draft),
  };
}
export function draftRecoveryItems(drafts: LocalDraft[]): RecoveryItem[] {
  return drafts.map(draftRecoveryItem);
}
export function captureDraft(draft: LocalDraft): CapturedDraft {
  return structuredClone({
    generation: draft.generation,
    content: draft.content,
    images: draft.images,
    base: draft.base,
  });
}
export function cloneDraftAsNew(
  draft: LocalDraft,
  content = draft.content,
  pendingImages = draft.images,
): LocalDraft {
  return validateLocalDraft(
    {
      ...createLocalDraft(draft, structuredClone(content)),
      images: pendingImages.map((image) => ({
        ...structuredClone(image),
        staged: null,
        operationKey: crypto.randomUUID(),
      })),
    },
    draft,
  );
}
