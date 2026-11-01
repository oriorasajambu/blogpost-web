'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { StaffMember } from '@/lib/auth-contract';
import { safeReturnTo } from '@/lib/auth-navigation';
import { authJson, AuthRequestError } from './client-api';
import { SignOutButton } from './sign-out-button';

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
  useEffect(() => {
    let mounted = true;
    const expire = () => {
      if (!mounted) return;
      setState('expired');
      const returnTo = safeReturnTo(window.location.pathname + window.location.search);
      window.location.replace(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
    };
    const check = async () => {
      if (document.visibilityState !== 'visible' || inFlight.current) return;
      inFlight.current = true;
      try {
        const result = await authJson<{ member: StaffMember | null }>('/api/session');
        if (!mounted) return;
        if (!result.member) {
          expire();
          return;
        }
        if (result.member.id !== member.id || result.member.role !== member.role) {
          // Rebuild server-authorized navigation and page content after account/role changes.
          setState('unavailable');
          window.location.reload();
          return;
        }
        setState('active');
      } catch (error) {
        if (!mounted) return;
        if (error instanceof AuthRequestError && error.status === 401) expire();
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
    const channel =
      typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(`${namespace}:session`);
    if (channel)
      channel.onmessage = (event: MessageEvent<unknown>) => {
        if (
          typeof event.data === 'object' &&
          event.data !== null &&
          'type' in event.data &&
          event.data.type === 'signed-out'
        )
          expire();
      };
    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', visible);
      window.removeEventListener('focus', visible);
      window.removeEventListener('pageshow', restored);
      channel?.close();
    };
  }, [member.id, member.role, namespace]);
  return (
    <>
      <div
        hidden={state !== 'active'}
        inert={state !== 'active'}
        aria-hidden={state !== 'active' || undefined}
      >
        {children}
      </div>
      {state !== 'active' && (
        <section className="auth-panel" aria-labelledby="session-status-heading">
          <p className="eyebrow">Staff session</p>
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
              : 'Local work has been kept. Return when the connection is available, or sign in again with your staff account.'}
          </p>
          <div className="auth-actions">
            {state !== 'revoked' && (
              <button
                type="button"
                className="button-secondary"
                onClick={() => window.location.reload()}
              >
                Try again
              </button>
            )}
            <SignOutButton
              namespace={namespace}
              accountId={member.id}
              destination="/sign-in"
              label="Review local work and sign out"
            />
          </div>
        </section>
      )}
    </>
  );
}
