'use client';

import { buttonSecondary, studio } from '@/components/ui/styles';
import { useRef, useState } from 'react';
import { staffRequest } from '@/features/staff/staff-api';
import { ConfirmAction, StaffError } from '@/features/staff/staff-ui';
import { validatePasswordSetupResult, type PasswordSetupResult } from './admin-contract';

/**
 * Migration from Google sign-in: emails every active member who has no password a link to choose
 * one. Safe to repeat; members who already have a password are skipped.
 */
export function PasswordSetupPanel() {
  const trigger = useRef<HTMLButtonElement>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [result, setResult] = useState<PasswordSetupResult | null>(null);
  async function send() {
    setBusy(true);
    setError(null);
    try {
      setResult(
        (
          await staffRequest('/admin/members/password-setup', validatePasswordSetupResult, {
            method: 'POST',
            content: {},
            key: crypto.randomUUID(),
            // Safe to repeat: members who already have a password are skipped, and no receipt is kept.
            receipt: false,
          })
        ).data,
      );
      setConfirming(false);
    } catch (failure) {
      setError(failure);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={studio.card} aria-labelledby="password-setup-heading">
      <h2 id="password-setup-heading">Password setup links</h2>
      <p>
        Staff now sign in with an email address and password. Email every active member who has not
        chosen a password yet a one-time link to set one. Their account and posts are kept. It is
        safe to run again: members who already have a password are skipped.
      </p>
      {confirming ? (
        <ConfirmAction
          title="Email password setup links?"
          confirmLabel="Send links"
          busy={busy}
          onConfirm={send}
          onCancel={() => setConfirming(false)}
          returnFocusRef={trigger}
        >
          <p>
            Each active member without a password receives one email. Links expire in about an hour.
          </p>
        </ConfirmAction>
      ) : (
        <div className={studio.actions}>
          <button
            ref={trigger}
            type="button"
            className={buttonSecondary}
            onClick={() => setConfirming(true)}
          >
            Email password setup links
          </button>
        </div>
      )}
      {error !== null && <StaffError error={error} />}
      {result && (
        <p role="status">
          {result.queued} {result.queued === 1 ? 'link' : 'links'} sent, {result.skipped}{' '}
          {result.skipped === 1 ? 'member' : 'members'} skipped.
        </p>
      )}
    </section>
  );
}
