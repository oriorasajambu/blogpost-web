'use client';

import { buttonPrimary, buttonSecondary, eyebrow, studio } from '@/components/ui/styles';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { StaffMember } from '@/lib/auth-contract';
import { safeReturnTo } from '@/lib/auth-navigation';
import { authJson, AuthRequestError } from './client-api';
import { SignOutButton } from './sign-out-button';
import {
  flushStaffRecovery,
  inspectStaffRecovery,
  exportStaffRecovery,
  staffTabIdentity,
} from './staff-storage';

export function StaffSessionBoundary({
  member,
  namespace,
  children,
}: {
  member: StaffMember;
  namespace: string;
  children: ReactNode;
}) {
  const [state, setState] = useState<'active' | 'expired' | 'revoked' | 'unavailable'>('active');
  const inFlight = useRef(false);
  const [exitError, setExitError] = useState('');
  useEffect(() => {
    let mounted = true;
    let sessionVersion = 0;
    const expire = async () => {
      if (!mounted) return;
      const version = ++sessionVersion;
      setState('expired');
      try {
        await flushStaffRecovery();
        const recovery = await inspectStaffRecovery(namespace, member.id);
        if (!mounted || version !== sessionVersion || recovery.length) return;
        const returnTo = safeReturnTo(window.location.pathname + window.location.search);
        window.location.replace(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
      } catch {
        if (mounted)
          setExitError('Device saving is unavailable. Export local work before leaving this tab.');
      }
    };
    const check = async () => {
      if (document.visibilityState !== 'visible' || inFlight.current) return;
      inFlight.current = true;
      const version = sessionVersion;
      try {
        const result = await authJson<{ member: StaffMember | null }>('/api/session');
        if (!mounted || version !== sessionVersion) return;
        if (!result.member) {
          void expire();
          return;
        }
        if (result.member.id !== member.id || result.member.role !== member.role) {
          // Rebuild server-authorized navigation and page content after account/role changes.
          setState('revoked');
          window.dispatchEvent(new Event('blogpost:staff-access-lost'));
          try {
            await flushStaffRecovery();
            window.location.reload();
          } catch {
            if (mounted)
              setExitError(
                'The staff account or role changed. Export local work before reloading; the previous workspace is hidden.',
              );
          }
          return;
        }
        setState('active');
      } catch (error) {
        if (!mounted || version !== sessionVersion) return;
        if (error instanceof AuthRequestError && error.status === 401) void expire();
        else {
          const revoked = error instanceof AuthRequestError && error.status === 403;
          if (revoked)
            window.dispatchEvent(
              new CustomEvent('blogpost:staff-access-lost', { detail: { accountId: member.id } }),
            );
          setState(revoked ? 'revoked' : 'unavailable');
        }
      } finally {
        inFlight.current = false;
      }
    };
    const restored = (event: PageTransitionEvent) => {
      if (event.persisted) void check();
    };
    const visible = () => {
      void check();
    };
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('focus', visible);
    window.addEventListener('pageshow', restored);
    const expired = () => {
      void expire();
    };
    const revoked = () => {
      sessionVersion++;
      if (mounted) setState('revoked');
      void flushStaffRecovery().catch(() => {});
    };
    window.addEventListener('blogpost:staff-session-expired', expired);
    window.addEventListener('blogpost:staff-access-lost', revoked);
    const channel =
      typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(`${namespace}:session`);
    if (channel)
      channel.onmessage = (event: MessageEvent<unknown>) => {
        if (
          typeof event.data === 'object' &&
          event.data !== null &&
          'type' in event.data &&
          event.data.type === 'signed-out' &&
          (!('sourceTab' in event.data) || event.data.sourceTab !== staffTabIdentity())
        )
          void expire();
      };
    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', visible);
      window.removeEventListener('focus', visible);
      window.removeEventListener('pageshow', restored);
      window.removeEventListener('blogpost:staff-session-expired', expired);
      window.removeEventListener('blogpost:staff-access-lost', revoked);
      channel?.close();
    };
  }, [member.id, member.role, namespace]);
  return (
    <>
      <div
        hidden={state === 'expired' || state === 'revoked'}
        inert={state === 'expired' || state === 'revoked'}
        aria-hidden={state === 'expired' || state === 'revoked' || undefined}
      >
        {children}
      </div>
      {state !== 'active' && (
        <section className={studio.authPanel} aria-labelledby="session-status-heading">
          <p className={eyebrow}>Staff session</p>
          <h1 id="session-status-heading">
            {state === 'expired'
              ? 'Sign in again to continue.'
              : state === 'revoked'
                ? 'Staff access is unavailable.'
                : 'We couldn’t check your staff session.'}
          </h1>
          <p>
            {state === 'revoked'
              ? 'Your staff workspace is hidden because access was denied. Local work has been kept so you can review or export it before signing out.'
              : state === 'unavailable'
                ? 'Your loaded workspace remains available for local writing. Sync needs a verified session and connection.'
                : 'Local work has been kept. Export it or sign in again with the same staff account to continue.'}
          </p>
          <div className={studio.actions}>
            {state !== 'revoked' && (
              <button
                type="button"
                className={buttonSecondary}
                onClick={() => {
                  void flushStaffRecovery()
                    .then(() => window.location.reload())
                    .catch(() =>
                      setExitError('Device saving failed. Export local work before reloading.'),
                    );
                }}
              >
                Try again
              </button>
            )}
            {state === 'expired' && (
              <button
                type="button"
                className={buttonPrimary}
                onClick={() => {
                  void flushStaffRecovery()
                    .then(() => {
                      const returnTo = safeReturnTo(
                        window.location.pathname + window.location.search,
                      );
                      window.location.replace(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
                    })
                    .catch(() =>
                      setExitError(
                        'Device saving failed. Export local work before signing in again.',
                      ),
                    );
                }}
              >
                Sign in again
              </button>
            )}
            <button
              type="button"
              className={buttonSecondary}
              onClick={() => {
                void exportStaffRecovery(namespace, member.id).catch(() =>
                  setExitError(
                    'Recovery export is unavailable. Keep this tab open and copy any text you can recover.',
                  ),
                );
              }}
            >
              Export local Markdown
            </button>
            <SignOutButton
              namespace={namespace}
              accountId={member.id}
              destination="/sign-in"
              label="Review local work and sign out"
            />
          </div>
          {exitError && <p role="alert">{exitError}</p>}
        </section>
      )}
    </>
  );
}
