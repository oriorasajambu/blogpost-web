import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearStaffStorage,
  inspectStaffRecovery,
  previousStaffIdentity,
  registerStaffRecoveryProvider,
  rememberStaffIdentity,
} from '../../src/features/auth/staff-storage';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() {
    return this.values.size;
  }
  clear() {
    this.values.clear();
  }
  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
  setItem(key: string, value: string) {
    this.values.set(key, String(value));
  }
}
const namespace = 'blogpost:test-stack:staff';
function browserStores() {
  const local = new MemoryStorage();
  const session = new MemoryStorage();
  const events: string[] = [];
  for (const [name, value] of Object.entries({
    localStorage: local,
    sessionStorage: session,
    window: {
      dispatchEvent: (event: Event) => {
        events.push(event.type);
        return true;
      },
    },
    indexedDB: undefined,
    BroadcastChannel: undefined,
  })) {
    Object.defineProperty(globalThis, name, { configurable: true, value });
  }
  return { local, session, events };
}
test('staff cleanup clears only its namespace and account-scoped recovery remains inspectable before deletion', async () => {
  const { local, session, events } = browserStores();
  local.setItem('blogpost-theme', 'dark');
  session.setItem('unrelated-tab-state', 'keep');
  local.setItem(
    `${namespace}:recovery`,
    JSON.stringify([
      {
        id: 'mine',
        title: 'Local work',
        markdown: 'Unsent text',
        accountId: 'account-one',
        unsynced: true,
      },
      {
        id: 'another',
        title: 'Other account',
        markdown: 'Private text',
        accountId: 'account-two',
        unsynced: true,
      },
      {
        id: 'synced',
        title: 'Server copy',
        markdown: 'Already safe',
        accountId: 'account-one',
        unsynced: false,
      },
    ]),
  );
  session.setItem(`${namespace}:pending`, 'operation-key');
  rememberStaffIdentity(namespace, 'member-one', 'provider-uid');
  assert.deepEqual(previousStaffIdentity(namespace), {
    memberId: 'member-one',
    identityUid: 'provider-uid',
  });
  let cleared = false;
  const unregister = registerStaffRecoveryProvider('test-drafts', {
    inspect: async () => [
      {
        id: 'provider',
        title: 'Editor work',
        markdown: 'Not synced',
        accountId: 'account-one',
        unsynced: true,
      },
    ],
    clear: async () => {
      cleared = true;
    },
  });
  try {
    assert.deepEqual(
      (await inspectStaffRecovery(namespace, 'account-one')).map((item) => item.id),
      ['mine', 'provider'],
    );
    await clearStaffStorage(namespace);
    assert.equal(cleared, true);
    assert.equal(local.getItem(`${namespace}:identity`), null);
    assert.equal(session.getItem(`${namespace}:pending`), null);
    assert.equal(local.getItem('blogpost-theme'), 'dark');
    assert.equal(session.getItem('unrelated-tab-state'), 'keep');
    assert.deepEqual(events, ['blogpost:before-staff-clear', 'blogpost:staff-cleared']);
  } finally {
    unregister();
  }
});
test('unreadable recovery state fails visibly rather than claiming there is no unsynced work', async () => {
  const { local } = browserStores();
  local.setItem(`${namespace}:recovery`, 'not-json');
  await assert.rejects(inspectStaffRecovery(namespace));
  local.setItem(
    `${namespace}:recovery`,
    JSON.stringify([{ id: 'broken', markdown: 'Missing title', unsynced: true }]),
  );
  await assert.rejects(inspectStaffRecovery(namespace));
});
test('a failed staff-store clear rejects and never announces successful clearance', async () => {
  const { local, events } = browserStores();
  local.setItem(`${namespace}:recovery`, '[]');
  const unregister = registerStaffRecoveryProvider('blocked-drafts', {
    inspect: async () => [],
    clear: async () => {
      throw new Error('Database is blocked.');
    },
  });
  try {
    await assert.rejects(clearStaffStorage(namespace), /blocked/);
    assert.equal(local.getItem(`${namespace}:recovery`), '[]');
    assert.deepEqual(events, ['blogpost:before-staff-clear']);
  } finally {
    unregister();
  }
});
