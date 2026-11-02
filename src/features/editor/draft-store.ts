import { validateLocalDraft } from './draft-model';
import type { DraftExpectation, DraftStore, EditorAccount, LocalDraft } from './draft-types';

export const EDITOR_DATABASE_VERSION = 1;
export const EDITOR_DRAFT_STORE = 'drafts';
export type DraftStorageFailure =
  | 'unavailable'
  | 'quota'
  | 'blocked'
  | 'migration'
  | 'corrupt'
  | 'closed'
  | 'conflict'
  | 'missing'
  | 'exists';
export class DraftStorageError extends Error {
  constructor(
    readonly code: DraftStorageFailure,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'DraftStorageError';
  }
}
export function editorDatabaseName(staffNamespace: string): string {
  if (!staffNamespace || !staffNamespace.endsWith(':staff'))
    throw new DraftStorageError('unavailable', 'The staff storage namespace is unavailable.');
  return `${staffNamespace}:editor`;
}
function storageError(error: unknown): Error {
  if (error instanceof DraftStorageError) return error;
  const name = error instanceof Error || error instanceof DOMException ? error.name : '';
  if (name === 'QuotaExceededError')
    return new DraftStorageError(
      'quota',
      'Device storage is full. Export your work before leaving this tab.',
      { cause: error },
    );
  if (name === 'VersionError')
    return new DraftStorageError(
      'migration',
      'This browser has drafts from another application version. Keep this tab open and export your work.',
      { cause: error },
    );
  if (name === 'InvalidLocalDraftError')
    return new DraftStorageError(
      'corrupt',
      'A local draft could not be read. Keep this tab open and export your work.',
      { cause: error },
    );
  return new DraftStorageError(
    'unavailable',
    'Device storage is unavailable. Keep this tab open and export your work.',
    { cause: error },
  );
}
/** Inspect existence/count only; recovery without a trusted UID must not expose draft content. */
export async function countEditorDraftRecords(staffNamespace: string): Promise<number> {
  const name = editorDatabaseName(staffNamespace);
  let database: IDBDatabase | null = null;
  try {
    if (typeof indexedDB === 'undefined') throw new Error('IndexedDB unavailable');
    const factory = indexedDB;
    if (
      typeof factory.databases === 'function' &&
      !(await factory.databases()).some((entry) => entry.name === name)
    )
      return 0;
    database = await new Promise<IDBDatabase | null>((resolve, reject) => {
      let settled = false;
      let absent = false;
      // No explicit version: this inspection must never upgrade an existing database.
      const request = factory.open(name);
      request.onupgradeneeded = (event) => {
        if (event.oldVersion === 0) {
          absent = true;
          request.transaction?.abort(); // Do not create an empty database as a side effect.
        }
      };
      request.onblocked = () => {
        settled = true;
        reject(
          new DraftStorageError(
            'blocked',
            'Close other Blogpost staff tabs before checking local work.',
          ),
        );
      };
      request.onerror = () => {
        if (absent) resolve(null);
        else reject(storageError(request.error));
      };
      request.onsuccess = () => {
        if (settled) request.result.close();
        else {
          settled = true;
          resolve(request.result);
        }
      };
    });
    if (!database) return 0;
    if (
      database.version !== EDITOR_DATABASE_VERSION ||
      database.objectStoreNames.length !== 1 ||
      !database.objectStoreNames.contains(EDITOR_DRAFT_STORE)
    )
      throw new DraftStorageError(
        'migration',
        'Local staff work cannot be checked safely with this application version.',
      );
    return await new Promise<number>((resolve, reject) => {
      const transaction = database!.transaction(EDITOR_DRAFT_STORE, 'readonly');
      const request = transaction.objectStore(EDITOR_DRAFT_STORE).count();
      let count = 0;
      request.onsuccess = () => {
        count = request.result;
      };
      transaction.oncomplete = () => resolve(count);
      transaction.onabort = () => reject(storageError(transaction.error));
      transaction.onerror = () => {
        /* Abort reports the failed inspection. */
      };
    });
  } catch (error) {
    throw storageError(error);
  } finally {
    database?.close();
  }
}
function assertExpectation(draft: LocalDraft, expected?: DraftExpectation) {
  if (
    (expected?.generation !== undefined && draft.generation !== expected.generation) ||
    (expected?.storageVersion !== undefined && draft.storageVersion !== expected.storageVersion)
  )
    throw new DraftStorageError(
      'conflict',
      'Another tab changed this local draft. Review its saved copy before continuing.',
    );
}
export type DraftStoreOptions = {
  onVersionChange?: () => void;
  onDeleteRequest?: () => void;
};

/** Resolves only after the database opens and the complete known schema is verified. */
export async function openDraftStore(
  staffNamespace: string,
  account: EditorAccount,
  options: DraftStoreOptions = {},
): Promise<DraftStore> {
  const databaseName = editorDatabaseName(staffNamespace);
  // Validate identity independently of storage availability without accepting a caller's mutation.
  if (!account.uid || !account.memberId)
    throw new DraftStorageError('unavailable', 'Sign in again before opening local drafts.');
  const scope = Object.freeze({ uid: account.uid, memberId: account.memberId });
  let database: IDBDatabase;
  try {
    if (typeof indexedDB === 'undefined') throw new Error('IndexedDB unavailable');
    database = await new Promise<IDBDatabase>((resolve, reject) => {
      let settled = false;
      const request = indexedDB.open(databaseName, EDITOR_DATABASE_VERSION);
      request.onblocked = () => {
        settled = true;
        reject(
          new DraftStorageError(
            'blocked',
            'Close other Blogpost staff tabs so local drafts can be opened safely.',
          ),
        );
      };
      request.onerror = () => reject(storageError(request.error));
      request.onupgradeneeded = (event) => {
        if (settled || event.oldVersion !== 0) {
          request.transaction?.abort();
          return;
        }
        const store = request.result.createObjectStore(EDITOR_DRAFT_STORE, {
          keyPath: ['uid', 'clientDraftId'],
        });
        store.createIndex('by-account', 'uid');
        store.createIndex('by-post', ['uid', 'postId'], { unique: true });
      };
      request.onsuccess = () => {
        if (settled) request.result.close();
        else {
          settled = true;
          resolve(request.result);
        }
      };
    });
  } catch (error) {
    throw storageError(error);
  }
  let closed = false;
  try {
    const transaction = database.transaction(EDITOR_DRAFT_STORE, 'readonly');
    const objectStore = transaction.objectStore(EDITOR_DRAFT_STORE);
    if (
      JSON.stringify(objectStore.keyPath) !== JSON.stringify(['uid', 'clientDraftId']) ||
      !objectStore.indexNames.contains('by-account') ||
      !objectStore.indexNames.contains('by-post') ||
      objectStore.index('by-account').keyPath !== 'uid' ||
      JSON.stringify(objectStore.index('by-post').keyPath) !== JSON.stringify(['uid', 'postId']) ||
      !objectStore.index('by-post').unique
    )
      throw new Error('Unknown editor schema');
  } catch (error) {
    database.close();
    throw new DraftStorageError(
      'migration',
      'Local draft storage could not be upgraded safely. Export your work before continuing.',
      { cause: error },
    );
  }
  database.onversionchange = (event) => {
    if (event.newVersion === null) {
      // Another tab must not erase this tab's debounced/in-memory work. Its deletion remains
      // blocked until the user exports/flushes and closes this connection explicitly.
      options.onDeleteRequest?.();
    } else {
      closed = true;
      database.close();
      options.onVersionChange?.();
    }
  };
  function transaction<T>(
    mode: IDBTransactionMode,
    perform: (
      store: IDBObjectStore,
      setResult: (value: T) => void,
      fail: (error: unknown) => void,
    ) => void,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (closed) {
        reject(
          new DraftStorageError(
            'closed',
            'Local draft storage is closed. Keep this tab open and export your work.',
          ),
        );
        return;
      }
      let tx: IDBTransaction;
      let result: T;
      let failure: unknown;
      try {
        tx = database.transaction(EDITOR_DRAFT_STORE, mode);
      } catch (error) {
        reject(storageError(error));
        return;
      }
      tx.oncomplete = () => resolve(result);
      tx.onabort = () => reject(storageError(failure ?? tx.error));
      tx.onerror = () => {
        /* onabort owns failure acknowledgment */
      };
      const fail = (error: unknown) => {
        failure = error;
        try {
          tx.abort();
        } catch {
          reject(storageError(error));
        }
      };
      try {
        perform(
          tx.objectStore(EDITOR_DRAFT_STORE),
          (value) => {
            result = value;
          },
          fail,
        );
      } catch (error) {
        fail(error);
      }
    });
  }
  const validate = (value: unknown) => validateLocalDraft(value, scope);
  function readRequest<T>(
    request: IDBRequest,
    transform: (value: unknown) => T,
    setResult: (value: T) => void,
    fail: (error: unknown) => void,
  ) {
    request.onsuccess = () => {
      try {
        setResult(transform(request.result));
      } catch (error) {
        fail(error);
      }
    };
  }
  return {
    databaseName,
    account: scope,
    get(clientDraftId) {
      return transaction('readonly', (store, setResult, fail) => {
        readRequest(
          store.get([scope.uid, clientDraftId]),
          (value) => (value === undefined ? null : validate(value)),
          setResult,
          fail,
        );
      });
    },
    findByPostId(postId) {
      return transaction('readonly', (store, setResult, fail) => {
        readRequest(
          store.index('by-post').get([scope.uid, postId]),
          (value) => (value === undefined ? null : validate(value)),
          setResult,
          fail,
        );
      });
    },
    list() {
      return transaction('readonly', (store, setResult, fail) => {
        readRequest(
          store.index('by-account').getAll(scope.uid),
          (value) =>
            (value as unknown[])
              .map(validate)
              .sort(
                (a, b) =>
                  (b.savedAt ?? '').localeCompare(a.savedAt ?? '') ||
                  a.clientDraftId.localeCompare(b.clientDraftId),
              ),
          setResult,
          fail,
        );
      });
    },
    create(value) {
      return transaction('readwrite', (store, setResult, fail) => {
        const draft = validate(structuredClone(value));
        if (draft.storageVersion !== 0)
          throw new DraftStorageError(
            'exists',
            'This local draft was already saved. Reload its saved copy.',
          );
        const committed = validate({
          ...draft,
          storageVersion: 1,
          savedAt: new Date().toISOString(),
        });
        const request = store.add(committed);
        request.onerror = () => {
          if (request.error?.name === 'ConstraintError')
            fail(
              new DraftStorageError(
                'exists',
                'This local draft already exists. Open its saved copy.',
              ),
            );
        };
        setResult(committed);
      });
    },
    update(clientDraftId, updater, expected) {
      return transaction('readwrite', (store, setResult, fail) => {
        const request = store.get([scope.uid, clientDraftId]);
        request.onsuccess = () => {
          try {
            if (request.result === undefined)
              throw new DraftStorageError(
                'missing',
                'This local draft is no longer on this device. Keep this tab open and export your work.',
              );
            const current = validate(request.result);
            assertExpectation(current, expected);
            const updated = validate(updater(structuredClone(current)));
            if (
              updated.clientDraftId !== current.clientDraftId ||
              (current.postId !== null && updated.postId !== current.postId) ||
              updated.generation < current.generation ||
              updated.storageVersion !== current.storageVersion
            )
              throw new DraftStorageError(
                'conflict',
                'The local draft changed during this operation. Reload its saved copy.',
              );
            const committed = validate({
              ...updated,
              storageVersion: current.storageVersion + 1,
              savedAt: new Date().toISOString(),
            });
            store.put(committed);
            setResult(committed);
          } catch (error) {
            fail(error);
          }
        };
      });
    },
    delete(clientDraftId, expected) {
      return transaction('readwrite', (store, setResult, fail) => {
        const request = store.get([scope.uid, clientDraftId]);
        request.onsuccess = () => {
          try {
            if (request.result !== undefined) {
              assertExpectation(validate(request.result), expected);
              store.delete([scope.uid, clientDraftId]);
            }
            setResult(undefined);
          } catch (error) {
            fail(error);
          }
        };
      });
    },
    clear() {
      return transaction('readwrite', (store, setResult) => {
        const request = store.index('by-account').openCursor(scope.uid);
        request.onsuccess = () => {
          const cursor = request.result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          } else setResult(undefined);
        };
      });
    },
    close() {
      closed = true;
      database.close();
    },
  };
}
