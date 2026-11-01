'use client';

import { useId, useRef, useState } from 'react';
import { authMutation, freshCsrf } from './client-api';
import { clearIdentity } from './identity-sdk';
import {
  clearStaffStorage,
  exportRecovery,
  inspectStaffRecovery,
  type RecoveryItem,
} from './staff-storage';

export function SignOutButton({
  namespace,
  accountId,
  destination = '/',
  label = 'Sign out',
}: {
  namespace: string;
  accountId?: string;
  destination?: '/' | '/sign-in';
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState<RecoveryItem[]>([]);
  const [exported, setExported] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const inFlight = useRef(false);
  const titleId = useId();
  const descriptionId = useId();
  const close = () => {
    dialog.current?.close();
    trigger.current?.focus();
  };
  async function complete() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    try {
      const csrf = await freshCsrf();
      await clearIdentity();
      await clearStaffStorage(namespace);
      await authMutation('/api/session/logout', {}, csrf.token);
      close();
      // A full navigation removes all staff React/query state from this tab.
      window.location.replace(destination);
    } catch {
      setError(
        'Sign-out could not be confirmed. Local staff data may already have been removed. Close other staff tabs, check your connection and try again.',
      );
    } finally {
      setBusy(false);
      inFlight.current = false;
    }
  }
  async function requestExit() {
    if (busy || inFlight.current) return;
    setError('');
    setBusy(true);
    setExported(false);
    try {
      const recovery = await inspectStaffRecovery(namespace, accountId);
      setItems(recovery);
      if (recovery.length) dialog.current?.showModal();
      else {
        setBusy(false);
        await complete();
      }
    } catch {
      setError(
        'We couldn’t check local staff work. Sign-out is paused so work is not removed without warning. Check browser storage and try again.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="staff-exit">
      <button
        ref={trigger}
        type="button"
        className="button-secondary"
        disabled={busy}
        onClick={() => void requestExit()}
      >
        {busy ? 'Signing out…' : label}
      </button>
      {error && <p role="alert">{error}</p>}
      <dialog
        ref={dialog}
        className="auth-dialog"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onCancel={() => close()}
      >
        <h2 id={titleId}>Keep a copy of your unsynced work</h2>
        <p id={descriptionId}>
          {items.length} {items.length === 1 ? 'draft has' : 'drafts have'} changes saved on this
          device that have not reached the server. Signing out removes this browser’s staff data.
        </p>
        <ul>
          {items.map((item) => (
            <li key={item.id}>{item.title || 'Untitled draft'}</li>
          ))}
        </ul>
        <div className="auth-actions">
          <button
            type="button"
            className="button-primary"
            disabled={busy}
            onClick={() => {
              exportRecovery(items);
              setExported(true);
            }}
          >
            Export Markdown
          </button>
          <button
            type="button"
            className="button-secondary"
            disabled={busy}
            onClick={() => void complete()}
          >
            Remove local work and sign out
          </button>
          <button type="button" className="text-link" disabled={busy} onClick={close}>
            Cancel
          </button>
        </div>
        {exported && (
          <p role="status">Markdown exported. Keep the downloaded file before signing out.</p>
        )}
        {error && <p role="alert">{error}</p>}
      </dialog>
    </div>
  );
}
