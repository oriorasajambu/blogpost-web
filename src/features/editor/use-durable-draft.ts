'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  previousStaffIdentity,
  registerStaffRecoveryProvider,
  type RecoveryItem,
} from '@/features/auth/staff-storage';
import type { StaffMember } from '@/lib/auth-contract';
import {
  createLocalDraft,
  conflictFromCleanRefresh,
  draftFromServer,
  editLocalDraft,
  isDraftDirty,
  refreshCleanDraft,
} from './draft-model';
import { DraftStorageError, openDraftStore } from './draft-store';
import { acquireDraftLease } from './tab-lease';
import { editorApi, EditorApiError } from './editor-api';
import { replaceMediaReferences } from './sync-engine';
import type { DraftContent, DraftStore, LocalDraft, PendingImage } from './draft-types';

export function recoveryItem(draft: LocalDraft): RecoveryItem {
  return {
    id: draft.clientDraftId,
    accountId: draft.memberId,
    title: draft.content.title,
    markdown: `${draft.content.summary ? `${draft.content.summary}\n\n` : ''}${draft.content.markdown}`,
    unsynced: isDraftDirty(draft),
  };
}
export function notifyEditorAccess(error: unknown) {
  if (
    !(error instanceof EditorApiError) &&
    !(typeof error === 'object' && error !== null && 'status' in error)
  )
    return;
  const status = (error as { status: number }).status;
  if (status === 401) window.dispatchEvent(new Event('blogpost:staff-session-expired'));
  if (status === 403) window.dispatchEvent(new Event('blogpost:staff-access-lost'));
}
type DraftSession = {
  key: string;
  active: boolean;
  ready: boolean;
  stopped: boolean;
  editingBlocked: boolean;
  current: LocalDraft | null;
  store: DraftStore | null;
  committedGeneration: number;
  timer: ReturnType<typeof setTimeout> | null;
  queue: Promise<void>;
  pendingWrites: number;
  refreshConflictPending: boolean;
  cache: LocalDraft[];
  mappings: Record<string, string>;
};
function normalized(draft: LocalDraft, mappings: Record<string, string>): LocalDraft {
  return {
    ...draft,
    content: replaceMediaReferences(draft.content, mappings),
    images: draft.images.filter((image) => !mappings[image.localId]),
  };
}
function cacheDraft(session: DraftSession, draft: LocalDraft) {
  session.cache = session.cache
    .filter((item) => item.clientDraftId !== draft.clientDraftId)
    .concat(draft);
}

export function useDurableDraft({
  namespace,
  member,
  localId,
  postId,
}: {
  namespace: string;
  member: StaffMember;
  localId?: string;
  postId?: string;
}) {
  const [draft, setDraft] = useState<LocalDraft | null>(null);
  const [error, setError] = useState('');
  const [paused, setPaused] = useState(false);
  const [contended, setContended] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const current = useRef<LocalDraft | null>(null);
  const store = useRef<DraftStore | null>(null);
  const committedGeneration = useRef(-1);
  const session = useRef<DraftSession | null>(null);
  const key = `${namespace}:${member.id}:${localId ?? `post:${postId ?? 'new'}`}`;
  const [viewKey, setViewKey] = useState(key);
  const networkAllowed = useRef(true);
  const adopt = useCallback((target: DraftSession, value: LocalDraft) => {
    target.current = value;
    if (target.active && session.current === target) {
      current.current = value;
      committedGeneration.current = target.committedGeneration;
      setDraft(value);
    }
  }, []);
  const failure = useCallback((target: DraftSession, reason: unknown) => {
    if (
      reason instanceof DraftStorageError &&
      (reason.code === 'conflict' ||
        (target.store !== null && ['migration', 'closed'].includes(reason.code)))
    ) {
      target.editingBlocked = true;
      if (target.active && session.current === target) setPaused(true);
    }
    if (target.active && session.current === target)
      setError(
        reason instanceof Error
          ? reason.message
          : 'Device storage failed. Keep this tab open and export your work.',
      );
  }, []);
  const persist = useCallback(
    async (target: DraftSession) => {
      if (target.timer) {
        clearTimeout(target.timer);
        target.timer = null;
      }
      if (
        target.refreshConflictPending ||
        !target.current ||
        target.current.generation === target.committedGeneration
      )
        return target.queue;
      if (!target.store || target.stopped)
        throw new Error(
          'This edit is not saved on your device. Keep this tab open and export your work.',
        );
      target.pendingWrites++;
      if (target.active && session.current === target) setSaving(true);
      // Queued work owns this captured session/store. Later routes cannot redirect
      // an old write into another draft or account.
      const task = target.queue
        .catch(() => {})
        .then(async () => {
          if (target.refreshConflictPending) return;
          const database = target.store;
          const snapshot = target.current;
          if (!database || target.stopped)
            throw new Error('Device storage is closed. Export your work.');
          if (!snapshot || snapshot.generation <= target.committedGeneration) return;
          const expectedGeneration = target.committedGeneration;
          const saved =
            expectedGeneration < 0
              ? await database.create(normalized(snapshot, target.mappings))
              : await database.update(
                  snapshot.clientDraftId,
                  (latest) => {
                    if (target.refreshConflictPending)
                      throw new DraftStorageError(
                        'conflict',
                        'The server refreshed while device changes were waiting. Your local changes are being preserved for review.',
                      );
                    // Sync may commit its mapping while this IDB transaction is waiting.
                    // Normalize at the atomic updater, rather than debounce/queue time.
                    const mapped = normalized(snapshot, target.mappings);
                    return {
                      ...latest,
                      content: mapped.content,
                      images: mapped.images,
                      generation: mapped.generation,
                    };
                  },
                  { generation: expectedGeneration },
                );
          target.committedGeneration = saved.generation;
          cacheDraft(target, saved);
          const volatile = target.current;
          adopt(
            target,
            volatile && volatile.generation > saved.generation
              ? {
                  ...saved,
                  content: replaceMediaReferences(volatile.content, target.mappings),
                  images: volatile.images.filter((image) => !target.mappings[image.localId]),
                  generation: volatile.generation,
                  savedAt: null,
                }
              : saved,
          );
          if (target.active && session.current === target && !target.editingBlocked) setError('');
        });
      target.queue = task;
      try {
        await task;
      } catch (reason) {
        failure(target, reason);
        throw reason;
      } finally {
        target.pendingWrites--;
        if (target.active && session.current === target) setSaving(target.pendingWrites > 0);
      }
    },
    [adopt, failure],
  );
  const flush = useCallback(async () => {
    const target = session.current;
    if (target?.key === key) await persist(target);
  }, [key, persist]);

  useEffect(() => {
    const target: DraftSession = {
      key,
      active: true,
      ready: false,
      stopped: false,
      editingBlocked: false,
      current: null,
      store: null,
      committedGeneration: -1,
      timer: null,
      queue: Promise.resolve(),
      pendingWrites: 0,
      refreshConflictPending: false,
      cache: [],
      mappings: {},
    };
    session.current = target;
    current.current = null;
    store.current = null;
    committedGeneration.current = -1;
    networkAllowed.current = true;
    let releaseLease: (() => void) | undefined;
    let editorUrl = window.location.href;
    let editorHistoryState = window.history.state;
    // Register before opening IDB so failed persistence still has recovery.
    const unregister = registerStaffRecoveryProvider(`editor:${key}:${crypto.randomUUID()}`, {
      flush: () => persist(target),
      inspect: async () => {
        let items = target.cache;
        if (target.store && !target.stopped) {
          try {
            items = await target.store.list();
          } catch {
            /* Volatile and previously inspected drafts still support export. */
          }
        }
        return items
          .filter((item) => item.clientDraftId !== target.current?.clientDraftId)
          .concat(target.current ?? [])
          .map(recoveryItem);
      },
      clear: async () => {
        if (target.timer) {
          clearTimeout(target.timer);
          target.timer = null;
        }
        target.stopped = true;
        target.editingBlocked = true;
        if (session.current === target) {
          networkAllowed.current = false;
          setPaused(true);
        }
        await target.queue.catch(() => {});
        target.store?.close();
        target.store = null;
        if (session.current === target) store.current = null;
      },
    });
    const stopNetwork = () => {
      if (!target.active) return;
      networkAllowed.current = false;
      target.editingBlocked = true;
      setPaused(true);
      // Access loss stops network work while permitting the final local commit.
      void persist(target).catch(() => {});
    };
    async function start() {
      try {
        const identity = previousStaffIdentity(namespace);
        if (!identity || identity.memberId !== member.id || !identity.identityUid)
          throw new Error('Sign in again with this staff account to open its device drafts.');
        const account = { uid: identity.identityUid, memberId: member.id };
        const fallback = createLocalDraft(account);
        if (!postId && !localId) adopt(target, fallback);
        const opened = await openDraftStore(namespace, account, {
          onVersionChange: () => {
            target.stopped = true;
            target.editingBlocked = true;
            if (target.active) {
              networkAllowed.current = false;
              setPaused(true);
              setError(
                'Another application version opened local drafts. Export your work before reloading.',
              );
            }
          },
          onDeleteRequest: () => {
            target.editingBlocked = true;
            if (target.active) {
              networkAllowed.current = false;
              setPaused(true);
              setError(
                'Another tab is trying to clear staff storage. Export your work, then close this writing tab before completing sign-out there.',
              );
            }
            // Hold deletion, but allow the last local edits to commit on this connection.
            void persist(target).catch(() => {});
          },
        });
        if (!target.active) {
          opened.close();
          return;
        }
        target.store = opened;
        store.current = opened;
        target.cache = await opened.list();
        if (!target.active) return;
        let record = localId
          ? await opened.get(localId)
          : postId
            ? await opened.findByPostId(postId)
            : null;
        if (!target.active) return;
        if (localId && !record)
          throw new Error(
            'This device draft is missing. Browser storage may have been cleared or evicted. Open a server draft or start a new draft.',
          );
        const serverId = postId ?? record?.postId;
        if (serverId) {
          if (!networkAllowed.current)
            throw new Error('Sign in again before opening this private draft.');
          // Authorize before displaying cached work; clean records adopt current
          // content, server versions, workflow state, and allowed actions.
          const response = await editorApi.getPost(serverId);
          if (!target.active) return;
          if (!record) record = await opened.create(draftFromServer(account, response.data));
          else if (!isDraftDirty(record)) {
            record = await opened.update(
              record.clientDraftId,
              (latest) => refreshCleanDraft(latest, response.data),
              { generation: record.generation, storageVersion: record.storageVersion },
            );
          } else if (record.base?.version !== response.data.version)
            setError(
              'The server has a newer version. Your local work and original base are kept; Sync will ask you to review the changes.',
            );
        }
        if (!target.active) return;
        if (!record) record = await opened.create(fallback);
        if (!target.active) return;
        target.committedGeneration = record.generation;
        cacheDraft(target, record);
        adopt(target, record);
        if (!postId && !localId)
          window.history.replaceState(null, '', `/studio/posts/new?local=${record.clientDraftId}`);
        editorUrl = window.location.href;
        editorHistoryState = window.history.state;
        releaseLease = acquireDraftLease(namespace, account, record.clientDraftId, (status) => {
          if (target.active) setContended(status.contended);
        }).release;
      } catch (reason) {
        if (target.active) {
          failure(target, reason);
          notifyEditorAccess(reason);
        }
      } finally {
        target.ready = true;
        if (target.active) setLoading(false);
      }
    }
    queueMicrotask(() => {
      if (!target.active) return;
      setViewKey(key);
      setDraft(null);
      setLoading(true);
      setPaused(false);
      setContended(false);
      setError('');
      void start();
    });
    const hasUncommittedWork = () =>
      !!target.current &&
      (target.current.generation !== target.committedGeneration || target.pendingWrites > 0);
    const unload = (event: BeforeUnloadEvent) => {
      if (hasUncommittedWork()) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    const navigate = (event: MouseEvent) => {
      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (
        !(anchor instanceof HTMLAnchorElement) ||
        anchor.target === '_blank' ||
        anchor.hasAttribute('download') ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey ||
        event.button !== 0 ||
        anchor.getAttribute('href')?.startsWith('#') ||
        !hasUncommittedWork()
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      void persist(target)
        .then(() => window.location.assign(anchor.href))
        .catch(() => {});
    };
    const historyExit = (event: PopStateEvent) => {
      if (!hasUncommittedWork()) return;
      const destination = window.location.href;
      const next = new URL(destination),
        previous = new URL(editorUrl);
      if (next.pathname === previous.pathname && next.search === previous.search) return;
      // The head-installed guard delegates the original event before the router.
      // Stop that event while the transaction decides whether leaving is safe.
      event.stopImmediatePropagation();
      void persist(target)
        .then(() => window.location.assign(destination))
        .catch(() => {
          if (target.active) window.history.pushState(editorHistoryState, '', editorUrl);
        });
    };
    const beforeHistory = (event: Event) => {
      historyExit((event as CustomEvent<PopStateEvent>).detail);
    };
    window.addEventListener('beforeunload', unload);
    window.addEventListener('blogpost:before-history', beforeHistory);
    window.addEventListener('popstate', historyExit, true);
    window.addEventListener('blogpost:staff-session-expired', stopNetwork);
    window.addEventListener('blogpost:staff-access-lost', stopNetwork);
    document.addEventListener('click', navigate, true);
    return () => {
      target.active = false;
      if (session.current === target) networkAllowed.current = false;
      releaseLease?.();
      window.removeEventListener('beforeunload', unload);
      window.removeEventListener('blogpost:before-history', beforeHistory);
      window.removeEventListener('popstate', historyExit, true);
      window.removeEventListener('blogpost:staff-session-expired', stopNetwork);
      window.removeEventListener('blogpost:staff-access-lost', stopNetwork);
      document.removeEventListener('click', navigate, true);
      if (target.timer) {
        clearTimeout(target.timer);
        target.timer = null;
      }
      // SPA exits can originate outside anchors. Drain this captured session
      // before closing its DB; failed volatile work stays available to recovery.
      const pending = target.ready ? persist(target) : Promise.resolve();
      void pending
        .then(unregister)
        .catch(() => {})
        .finally(() => {
          target.store?.close();
          target.store = null;
          if (session.current === target) store.current = null;
        });
    };
  }, [key, namespace, member.id, localId, postId, adopt, failure, persist, networkAllowed]);

  const edit = useCallback(
    (content: DraftContent, images?: PendingImage[]) => {
      const target = session.current;
      if (
        !target ||
        target.key !== key ||
        !target.current ||
        target.stopped ||
        target.editingBlocked ||
        target.refreshConflictPending ||
        target.current.conflict !== null
      )
        return;
      adopt(target, editLocalDraft(target.current, content, images));
      if (target.timer) clearTimeout(target.timer);
      target.timer = setTimeout(() => {
        void persist(target).catch(() => {});
      }, 250);
    },
    [key, adopt, persist],
  );
  const reconcile = useCallback(
    (saved: LocalDraft, mappings: Record<string, string> = {}, cleanServerRefresh = false) => {
      const target = session.current;
      if (
        !target ||
        target.key !== key ||
        !target.active ||
        target.current?.clientDraftId !== saved.clientDraftId
      )
        return;
      Object.assign(target.mappings, mappings);
      // Late progress may predate a local transaction already acknowledged here.
      if (saved.storageVersion < target.current.storageVersion) return;
      const volatile = target.current;
      if (
        cleanServerRefresh &&
        saved.base &&
        !isDraftDirty(saved) &&
        volatile.generation > target.committedGeneration &&
        JSON.stringify(volatile.base) !== JSON.stringify(saved.base)
      ) {
        // The clean refresh advanced the store while typing was still outside its
        // debounce transaction. Numeric generations may now coincide. Never drop
        // that typing or silently rebase it against server content not yet reviewed.
        const recovery = conflictFromCleanRefresh(volatile, saved);
        target.refreshConflictPending = true;
        target.editingBlocked = true;
        target.committedGeneration = saved.generation;
        target.pendingWrites++;
        setSaving(true);
        adopt(target, recovery);
        const task = target.queue
          .catch(() => {})
          .then(async () => {
            if (!target.store || target.stopped)
              throw new Error('Device storage is closed. Export your combined recovery copy.');
            const committed = await target.store.update(
              saved.clientDraftId,
              (latest) => ({
                ...recovery,
                storageVersion: latest.storageVersion,
              }),
              { generation: saved.generation, storageVersion: saved.storageVersion },
            );
            target.committedGeneration = committed.generation;
            cacheDraft(target, committed);
            adopt(target, committed);
            if (networkAllowed.current) {
              target.editingBlocked = false;
              if (target.active && session.current === target) setPaused(false);
            }
            if (target.active && session.current === target)
              setError(
                'The server refreshed while you were typing. Your device changes and original base are kept. Review the current server version before syncing.',
              );
          });
        target.queue = task;
        void task
          .catch((reason) => failure(target, reason))
          .finally(() => {
            target.refreshConflictPending = false;
            target.pendingWrites--;
            if (target.active && session.current === target) setSaving(target.pendingWrites > 0);
          });
        return;
      }
      target.committedGeneration = saved.generation;
      cacheDraft(target, saved);
      adopt(
        target,
        volatile.generation > saved.generation
          ? {
              ...saved,
              content: replaceMediaReferences(volatile.content, target.mappings),
              images: volatile.images.filter((image) => !target.mappings[image.localId]),
              generation: volatile.generation,
              savedAt: null,
            }
          : saved,
      );
    },
    [key, adopt, failure],
  );
  return {
    // Route/account props can change before passive-effect cleanup runs. Never
    // render the previous session's cached draft during that first render.
    draft: viewKey === key ? draft : null,
    current,
    store,
    error: viewKey === key ? error : '',
    paused,
    contended,
    loading: viewKey !== key || loading,
    saving,
    edit,
    flush,
    reconcile,
    setError,
    setPaused,
    committedGeneration,
    networkAllowed,
  };
}
