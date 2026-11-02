'use client';

export type RecoveryItem = {
  id: string;
  title: string;
  markdown: string;
  accountId?: string;
  unsynced: boolean;
};
export type StaffRecoveryProvider = {
  flush?: () => Promise<void>;
  inspect: () => Promise<RecoveryItem[]>;
  clear: () => Promise<void>;
};
const providers = new Map<string, StaffRecoveryProvider>();
let tabIdentity: string | undefined;
/** Distinguishes another tab's logout from this document's own final navigation. */
export function staffTabIdentity() {
  return (tabIdentity ??= crypto.randomUUID());
}
/** Controlled exits wait for the editor's transaction acknowledgment. */
export async function flushStaffRecovery() {
  await Promise.all([...providers.values()].map((provider) => provider.flush?.()));
}
/** The durable editor registers its committed-store recovery adapter here when loaded. */
export function registerStaffRecoveryProvider(name: string, provider: StaffRecoveryProvider) {
  providers.set(name, provider);
  return () => {
    if (providers.get(name) === provider) providers.delete(name);
  };
}
function localKeys(storage: Storage, namespace: string) {
  return Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter(
    (key): key is string => !!key && (key === namespace || key.startsWith(`${namespace}:`)),
  );
}
export async function inspectStaffRecovery(namespace: string, accountId?: string) {
  // Inspection must include volatile edits even when persistence has failed. Each
  // provider exposes those edits itself; a failed flush must not hide its export.
  await Promise.allSettled([...providers.values()].map((provider) => provider.flush?.()));
  // Touch both stores so denied storage cannot silently become an empty/safe result.
  localKeys(localStorage, namespace);
  localKeys(sessionStorage, namespace);
  const raw = localStorage.getItem(`${namespace}:recovery`);
  const stored: unknown = raw ? JSON.parse(raw) : [];
  if (!Array.isArray(stored)) throw new Error('Local recovery information is unavailable.');
  let durable: RecoveryItem[] = [];
  const identity = previousStaffIdentity(namespace);
  const identityMatches = !!identity && (!accountId || identity.memberId === accountId);
  if (!identityMatches) {
    const { countEditorDraftRecords } = await import('@/features/editor/draft-store');
    if (await countEditorDraftRecords(namespace))
      throw new Error(
        'Local staff drafts exist, but their account identity is unavailable. Sign in with the account that created them before reviewing or removing this browser’s staff data.',
      );
  }
  // Recovery must also work on profile/sign-in pages and after a browser restart,
  // when no editor component has registered an in-memory adapter.
  if (!providers.size) {
    if (identity && identityMatches && typeof indexedDB !== 'undefined') {
      const [{ openDraftStore }, { draftRecoveryItems }] = await Promise.all([
        import('@/features/editor/draft-store'),
        import('@/features/editor/draft-model'),
      ]);
      const database = await openDraftStore(namespace, {
        uid: identity.identityUid,
        memberId: identity.memberId,
      });
      try {
        durable = draftRecoveryItems(await database.list());
      } finally {
        database.close();
      }
    }
  }
  const records = [
    ...stored,
    ...durable,
    ...(await Promise.all([...providers.values()].map((provider) => provider.inspect()))).flat(),
  ];
  const selected: RecoveryItem[] = [];
  for (const value of records) {
    if (
      typeof value !== 'object' ||
      value === null ||
      typeof value.id !== 'string' ||
      typeof value.title !== 'string' ||
      typeof value.markdown !== 'string' ||
      typeof value.unsynced !== 'boolean' ||
      (value.accountId !== undefined && typeof value.accountId !== 'string')
    )
      throw new Error('Local recovery information is unavailable.');
    if (value.unsynced && (!accountId || !value.accountId || value.accountId === accountId))
      selected.push(value);
  }
  return selected;
}
export function exportRecovery(items: RecoveryItem[]) {
  const text = items
    .map((item) => `# ${item.title || 'Untitled draft'}\n\n${item.markdown}\n`)
    .join('\n---\n\n');
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'blogpost-unsynced-drafts.md';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
/** Export remains available when storage permission fails after an editor loaded. */
export async function exportStaffRecovery(namespace: string, accountId?: string) {
  if (!providers.size) return exportRecovery(await inspectStaffRecovery(namespace, accountId));
  const items = (
    await Promise.all([...providers.values()].map((provider) => provider.inspect()))
  ).flat();
  exportRecovery(
    items.filter((item) => item.unsynced && (!accountId || item.accountId === accountId)),
  );
}
function removeDatabase(name: string) {
  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Local staff data could not be removed.'));
    request.onblocked = () => reject(new Error('Close other Blogpost staff tabs, then try again.'));
  });
}
export async function clearStaffStorage(namespace: string) {
  window.dispatchEvent(new Event('blogpost:before-staff-clear'));
  await Promise.all([...providers.values()].map((provider) => provider.clear()));
  if (typeof indexedDB !== 'undefined') {
    const names =
      typeof indexedDB.databases === 'function'
        ? (await indexedDB.databases()).flatMap((database) =>
            database.name ? [database.name] : [],
          )
        : [namespace, `${namespace}:editor`];
    await Promise.all(
      names
        .filter((name) => name === namespace || name.startsWith(`${namespace}:`))
        .map(removeDatabase),
    );
  }
  for (const storage of [localStorage, sessionStorage]) {
    for (const key of localKeys(storage, namespace)) storage.removeItem(key);
    if (localKeys(storage, namespace).length)
      throw new Error('Local staff data could not be removed.');
  }
  providers.clear();
  window.dispatchEvent(new Event('blogpost:staff-cleared'));
  if (typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel(`${namespace}:session`);
    channel.postMessage({ type: 'signed-out', sourceTab: staffTabIdentity() });
    channel.close();
  }
}
export function previousStaffIdentity(
  namespace: string,
): { memberId: string; identityUid: string } | null {
  const value = localStorage.getItem(`${namespace}:identity`);
  if (!value) return null;
  const parsed: unknown = JSON.parse(value);
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('memberId' in parsed) ||
    !('identityUid' in parsed) ||
    typeof parsed.memberId !== 'string' ||
    typeof parsed.identityUid !== 'string'
  )
    throw new Error('Local account information is unavailable.');
  return { memberId: parsed.memberId, identityUid: parsed.identityUid };
}
export function rememberStaffIdentity(namespace: string, memberId: string, identityUid: string) {
  localStorage.setItem(`${namespace}:identity`, JSON.stringify({ memberId, identityUid }));
}
