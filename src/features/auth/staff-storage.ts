'use client';

export type RecoveryItem = {
  id: string;
  title: string;
  markdown: string;
  accountId?: string;
  unsynced: boolean;
};
export type StaffRecoveryProvider = {
  inspect: () => Promise<RecoveryItem[]>;
  clear: () => Promise<void>;
};
const providers = new Map<string, StaffRecoveryProvider>();
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
  // Touch both stores so denied storage cannot silently become an empty/safe result.
  localKeys(localStorage, namespace);
  localKeys(sessionStorage, namespace);
  const raw = localStorage.getItem(`${namespace}:recovery`);
  const stored: unknown = raw ? JSON.parse(raw) : [];
  if (!Array.isArray(stored)) throw new Error('Local recovery information is unavailable.');
  const records = [
    ...stored,
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
        : [namespace];
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
    channel.postMessage({ type: 'signed-out' });
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
