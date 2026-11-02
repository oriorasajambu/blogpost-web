import test from 'node:test';
import assert from 'node:assert/strict';
import { acquireDraftLease, type DraftLeaseState } from '../../src/features/editor/tab-lease';

class TestChannel {
  static all = new Set<TestChannel>();
  onmessage: ((event: { data: unknown }) => void) | null = null;
  closed = false;
  constructor(readonly name: string) {
    TestChannel.all.add(this);
  }
  postMessage(data: unknown) {
    if (this.closed) return;
    for (const channel of TestChannel.all) {
      if (channel !== this && !channel.closed && channel.name === this.name)
        queueMicrotask(() => {
          if (!channel.closed) channel.onmessage?.({ data });
        });
    }
  }
  close() {
    this.closed = true;
    TestChannel.all.delete(this);
  }
}
const account = { uid: 'identity-one', memberId: 'member-one' };
const draftId = '20000000-0000-4000-8000-000000000001';
const turn = () => new Promise<void>((resolve) => setImmediate(resolve));

test('tab presence warns both editors, remains account/draft scoped, and clears after a controlled release', async () => {
  const original = globalThis.BroadcastChannel;
  Object.defineProperty(globalThis, 'BroadcastChannel', { configurable: true, value: TestChannel });
  const first: DraftLeaseState[] = [],
    second: DraftLeaseState[] = [],
    other: DraftLeaseState[] = [];
  const a = acquireDraftLease('blogpost:test:staff', account, draftId, (state) =>
    first.push(state),
  );
  const b = acquireDraftLease('blogpost:test:staff', account, draftId, (state) =>
    second.push(state),
  );
  const c = acquireDraftLease(
    'blogpost:test:staff',
    { ...account, uid: 'identity-two' },
    draftId,
    (state) => other.push(state),
  );
  try {
    await turn();
    assert.equal(first.at(-1)?.contended, true);
    assert.equal(second.at(-1)?.contended, true);
    assert.deepEqual(first.at(-1)?.otherTabIds, [b.tabId]);
    assert.equal(other.at(-1)?.contended, false);
    b.release();
    await turn();
    assert.equal(first.at(-1)?.contended, false);
    a.release();
    a.release();
  } finally {
    a.release();
    b.release();
    c.release();
    Object.defineProperty(globalThis, 'BroadcastChannel', { configurable: true, value: original });
  }
});

test('blocked tab messaging is reported as unsupported without pretending there is a cross-tab lock', () => {
  const original = globalThis.BroadcastChannel;
  Object.defineProperty(globalThis, 'BroadcastChannel', {
    configurable: true,
    value: class {
      constructor() {
        throw new Error('Unavailable');
      }
    },
  });
  try {
    const states: DraftLeaseState[] = [];
    const lease = acquireDraftLease('blogpost:test:staff', account, draftId, (state) =>
      states.push(state),
    );
    assert.equal(lease.supported, false);
    assert.deepEqual(states, [{ supported: false, contended: false, otherTabIds: [] }]);
    lease.release();
  } finally {
    Object.defineProperty(globalThis, 'BroadcastChannel', { configurable: true, value: original });
  }
});
