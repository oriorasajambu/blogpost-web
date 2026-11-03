import { editorDatabaseName } from './draft-store';
import type { EditorAccount } from './draft-types';

export type DraftLeaseState = {
  supported: boolean;
  contended: boolean;
  otherTabIds: string[];
};
export type DraftLease = {
  readonly tabId: string;
  readonly supported: boolean;
  release: () => void;
};
export const LEASE_HEARTBEAT_MS = 5000;
export const LEASE_EXPIRY_MS = 15000;
const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

/** Advisory presence only: IDB compare-and-swap and server versions remain authoritative. */
export function acquireDraftLease(
  staffNamespace: string,
  account: EditorAccount,
  clientDraftId: string,
  onChange: (state: DraftLeaseState) => void,
): DraftLease {
  const tabId = crypto.randomUUID();
  let channel: BroadcastChannel;
  try {
    channel = new BroadcastChannel(
      `${editorDatabaseName(staffNamespace)}:lease:${encodeURIComponent(account.uid)}:${clientDraftId}`,
    );
  } catch {
    onChange({ supported: false, contended: false, otherTabIds: [] });
    return { tabId, supported: false, release() {} };
  }
  let released = false;
  const peers = new Map<string, number>();
  let previous = '';
  function publish() {
    const otherTabIds = [...peers.keys()].sort();
    const signature = otherTabIds.join(',');
    if (signature !== previous) {
      previous = signature;
      onChange({ supported: true, contended: otherTabIds.length > 0, otherTabIds });
    }
  }
  function send(type: 'hello' | 'present' | 'goodbye') {
    if (!released) channel.postMessage({ type, tabId });
  }
  channel.onmessage = (event: MessageEvent<unknown>) => {
    if (released || !event.data || typeof event.data !== 'object') return;
    const message = event.data as Record<string, unknown>;
    if (
      typeof message.tabId !== 'string' ||
      !uuidPattern.test(message.tabId) ||
      message.tabId === tabId
    )
      return;
    if (message.type === 'goodbye') peers.delete(message.tabId);
    else if (message.type === 'hello' || message.type === 'present') {
      peers.set(message.tabId, Date.now());
      if (message.type === 'hello') send('present');
    } else return;
    publish();
  };
  const heartbeat = setInterval(() => {
    const now = Date.now();
    for (const [id, seen] of peers) if (now - seen > LEASE_EXPIRY_MS) peers.delete(id);
    publish();
    send('present');
  }, LEASE_HEARTBEAT_MS);
  onChange({ supported: true, contended: false, otherTabIds: [] });
  send('hello');
  return {
    tabId,
    supported: true,
    release() {
      if (released) return;
      send('goodbye');
      released = true;
      clearInterval(heartbeat);
      channel.close();
      peers.clear();
    },
  };
}
