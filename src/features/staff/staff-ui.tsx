'use client';

import {
  useEffect,
  useId,
  useRef,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from 'react';
import { StaffApiError } from './staff-api';

export function staffErrorCopy(code: string, status?: number) {
  switch (code) {
    case 'CLIENT_UPDATE_REQUIRED':
      return 'Update this application before changing staff work. Local drafts are kept and can still be exported.';
    case 'MEMBER_ALREADY_EXISTS':
      return 'This email already belongs to a staff member. Review the existing member’s access instead.';
    case 'RESOURCE_QUOTA_EXCEEDED':
      return 'The workspace limit has been reached. Review existing items before adding another.';
    case 'INVALID_REQUEST':
      return 'The request could not be accepted. Check the entered values and try again.';
    case 'PRECONDITION_REQUIRED':
      return 'Load the latest item before changing it, then review and confirm your proposal.';
    case 'LAST_ADMIN_REQUIRED':
      return 'Keep at least one active administrator. Add or reactivate another administrator before changing this account.';
    case 'VERSION_CONFLICT':
    case 'PRECONDITION_FAILED':
      return 'This item changed since you opened it. Your proposal is kept. Load the latest version, compare it, and confirm a new action.';
    case 'OUTCOME_UNKNOWN':
      return 'The response was lost. The action may have completed. Keep this tab open and retry the same action to safely recover its result.';
    case 'IDEMPOTENCY_KEY_REUSED':
    case 'IDEMPOTENCY_CONFLICT':
      return 'This operation key belongs to different input. Refresh the item and review its state before starting another action.';
    case 'IDEMPOTENCY_IN_PROGRESS':
      return 'The same action is still processing. Wait briefly, then retry the same action.';
    case 'SLUG_RESERVED':
      return 'This address is reserved. Choose a different slug.';
    case 'SLUG_CONFLICT':
    case 'SLUG_ALREADY_EXISTS':
      return 'This address or an earlier redirect already belongs to another article. Choose a different slug.';
    case 'WORKFLOW_CONFLICT':
      return 'The article’s workflow changed or the action is unavailable in its current state. Refresh and review before continuing.';
    case 'VALIDATION_FAILED':
      return 'Some values could not be accepted. Check the form and try again.';
    case 'INVALID_API_RESPONSE':
      return 'The server returned an incompatible response. If you were changing something, its result is uncertain. Keep this tab open and recover the same action.';
    case 'RESOURCE_NOT_FOUND':
      return 'This item is unavailable. It may have been removed or your access may have changed.';
    case 'CSRF_VALIDATION_FAILED':
      return 'The security check expired. Retry the same action to obtain a fresh check.';
    case 'RATE_LIMITED':
      return 'Too many requests. Wait briefly before trying again.';
    default:
      if (status === 401)
        return 'Your session expired. Local writing is kept; sign in again to continue.';
      if (status === 403)
        return 'You no longer have permission for this action. Refresh your workspace or ask an administrator to check your access.';
      if (status === 412)
        return 'This item changed. Your proposal is kept. Load and compare the latest version before confirming again.';
      return 'The workspace could not connect. Keep any pending action open and try again when connected.';
  }
}
export function StaffError({ error }: { error: unknown }) {
  if (!error) return null;
  const known = error instanceof StaffApiError;
  return (
    <div className="staff-error" role="alert">
      <p>{staffErrorCopy(known ? error.code : '', known ? error.status : undefined)}</p>
      {known && error.traceId && (
        <p className="staff-muted">
          Support reference: <code>{error.traceId}</code>
        </p>
      )}
    </div>
  );
}
const subscribe = () => () => {};
const timezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
export function StaffTime({ value }: { value: string | null }) {
  const zone = useSyncExternalStore(subscribe, timezone, () => 'UTC');
  if (!value) return <span>—</span>;
  return (
    <time dateTime={value} title={value}>
      {new Intl.DateTimeFormat('en', {
        dateStyle: 'medium',
        timeStyle: 'medium',
        timeZone: zone,
      }).format(new Date(value))}{' '}
      ({zone})
    </time>
  );
}
/** Inline confirmation keeps consequences and controls together without hiding the page. */
export function ConfirmAction({
  title,
  children,
  confirmLabel,
  onConfirm,
  busy = false,
  disabled = false,
  onCancel,
  returnFocusRef,
}: {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
  busy?: boolean;
  disabled?: boolean;
  onCancel?: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
}) {
  const id = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    // Disabled fieldsets blur their controls before this effect runs. Callers
    // keep the originating control explicitly so cancellation still returns to it.
    const trigger = returnFocusRef?.current ?? document.activeElement;
    heading.current?.focus();
    return () => {
      queueMicrotask(() => {
        const active = document.activeElement;
        if (
          trigger instanceof HTMLElement &&
          trigger.isConnected &&
          !trigger.matches(':disabled') &&
          !trigger.closest('[hidden], [inert], [aria-hidden="true"]') &&
          (active === document.body || active === document.documentElement || !active?.isConnected)
        )
          trigger.focus();
      });
    };
  }, [returnFocusRef, title]);
  return (
    <section className="staff-confirm" aria-labelledby={id}>
      <h3 ref={heading} tabIndex={-1} id={id}>
        {title}
      </h3>
      {children}
      <div className="staff-actions">
        <button
          type="button"
          className="button-primary"
          disabled={busy || disabled}
          onClick={() => void onConfirm()}
        >
          {busy ? 'Working…' : confirmLabel}
        </button>
        {onCancel && (
          <button type="button" className="button-secondary" disabled={busy} onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </section>
  );
}
