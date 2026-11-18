'use client';

import { auth, textLink } from '@/components/ui/styles';
import { useEffect, useRef, useState } from 'react';
import type { UserCredential } from 'firebase/auth';
import type { StaffMember } from '@/lib/auth-contract';
import { identityError, safeReturnTo } from '@/lib/auth-navigation';
import { authJson, authMutation, AuthRequestError, freshCsrf } from './client-api';
import {
  clearIdentity,
  googlePopup,
  googleRedirect,
  googleRedirectResult,
  identitySdk,
  passwordSignIn,
} from './identity-sdk';
import { previousStaffIdentity, rememberStaffIdentity } from './staff-storage';
import { SignOutButton } from './sign-out-button';
import { useAuthDocumentPolicy } from './document-policy';
import { AuthIcon, Notice, PasswordField, TextField } from './auth-ui';

type FlowContext = { pending: boolean; invitation: boolean; returnTo: string };
type Ready = { csrf: string; invitation: boolean; returnTo: string };
type RedirectContext = { csrf: string; state: string; returnTo: string; createdAt: number };
function errorCode(error: unknown) {
  return error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
    ? error.code
    : 'UNKNOWN';
}

export function AuthPanel({
  namespace,
  returnTo = '/studio/posts',
  invitation = false,
  redirectReturn = false,
  googleSignIn = true,
}: {
  namespace: string;
  returnTo?: string;
  invitation?: boolean;
  redirectReturn?: boolean;
  /** False after the cutover: only email and password remain. */
  googleSignIn?: boolean;
}) {
  useAuthDocumentPolicy();
  const [ready, setReady] = useState<Ready | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [code, setCode] = useState('');
  const [redirectAllowed, setRedirectAllowed] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryReturnTo, setRecoveryReturnTo] = useState(() => safeReturnTo(returnTo));
  const load = useRef<Promise<Ready> | null>(null);
  const pending = useRef(false);
  const operationKey = useRef<string | undefined>(undefined);
  const invitationAccepted = useRef(false);
  const redirectKey = `${namespace}:oauth-redirect`;

  async function establish(credential: UserCredential, context: Ready) {
    try {
      const previous = previousStaffIdentity(namespace);
      if (previous && previous.identityUid !== credential.user.uid)
        throw new AuthRequestError('ACCOUNT_SWITCH_NEEDS_LOGOUT', 409);
      const idToken = await credential.user.getIdToken(true);
      if (context.invitation && !invitationAccepted.current) {
        operationKey.current ??= crypto.randomUUID();
        await authMutation('/api/invitations/accept', { idToken, flow: true }, context.csrf, {
          'Idempotency-Key': operationKey.current,
        });
        invitationAccepted.current = true;
      }
      const result = await authMutation<{ member: StaffMember; expiresAt: string }>(
        '/api/session',
        { idToken },
        context.csrf,
      );
      rememberStaffIdentity(namespace, result.member.id, credential.user.uid);
      // A successful popup flow must not be reported as failed merely because
      // temporary redirect bookkeeping is unavailable in this browser.
      try {
        sessionStorage.removeItem(redirectKey);
      } catch {
        /* no credential was stored here */
      }
      await clearIdentity();
      window.location.replace(safeReturnTo(context.returnTo));
    } finally {
      await clearIdentity();
    }
  }

  async function initialize(): Promise<Ready> {
    if (redirectReturn) {
      const raw = sessionStorage.getItem(redirectKey);
      if (!raw) throw new AuthRequestError('OAUTH_STATE_INVALID', 403);
      const saved = JSON.parse(raw) as RedirectContext;
      if (
        typeof saved.csrf !== 'string' ||
        typeof saved.state !== 'string' ||
        typeof saved.createdAt !== 'number' ||
        Date.now() - saved.createdAt > 10 * 60 * 1000 ||
        saved.createdAt > Date.now() + 5000 ||
        safeReturnTo(saved.returnTo) !== saved.returnTo
      )
        throw new AuthRequestError('OAUTH_STATE_INVALID', 403);
      setRecoveryReturnTo(saved.returnTo);
      const flow = await authJson<FlowContext>('/api/auth/redirect', {
        headers: { 'X-CSRF-Token': saved.csrf, 'X-OAuth-State': saved.state },
      });
      if (!flow.pending || flow.returnTo !== saved.returnTo)
        throw new AuthRequestError('OAUTH_STATE_INVALID', 403);
      const context = { csrf: saved.csrf, invitation: flow.invitation, returnTo: saved.returnTo };
      const credential = await googleRedirectResult();
      if (!credential) throw new AuthRequestError('auth/popup-closed-by-user', 401);
      await establish(credential, context);
      return context;
    }
    const csrf = await freshCsrf();
    if (invitation) {
      const flow = await authJson<FlowContext>('/api/auth/redirect', {
        headers: { 'X-CSRF-Token': csrf.token },
      });
      if (!flow.pending || !flow.invitation) throw new AuthRequestError('INVALID_INVITATION', 404);
      return { csrf: csrf.token, invitation: true, returnTo: safeReturnTo(flow.returnTo) };
    }
    return { csrf: csrf.token, invitation: false, returnTo: safeReturnTo(returnTo) };
  }
  useEffect(() => {
    let active = true;
    load.current ??= initialize();
    void load.current
      .then((context) => {
        if (active) setReady(context);
      })
      .catch((error) => {
        if (active) {
          setCode(errorCode(error));
          setMessage(identityError(errorCode(error)));
        }
      });
    return () => {
      active = false;
    };
    // One exchange per mounted page, including React's development effect replay.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signIn(method: 'google' | 'password' = 'google') {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setMessage('');
    setCode('');
    try {
      const context = ready ?? (await initialize());
      setReady(context);
      const sdk = await identitySdk();
      setRedirectAllowed(sdk.config.redirectEnabled === true);
      let credential: UserCredential;
      if (method === 'password') {
        credential = await passwordSignIn(email.trim(), password);
        // Verification is checked here for a clear message; the API enforces it again.
        if (!credential.user.emailVerified) throw new AuthRequestError('EMAIL_NOT_VERIFIED', 401);
      } else credential = await googlePopup();
      await establish(credential, context);
    } catch (error) {
      const nextCode = errorCode(error);
      if (nextCode === 'CSRF_VALIDATION_FAILED') {
        // Another tab or a long-open page can invalidate this preparation.
        // The next explicit attempt obtains a new signed cookie/header pair.
        setReady(null);
        load.current = null;
      }
      setCode(nextCode);
      setMessage(
        nextCode === 'ACCOUNT_SWITCH_NEEDS_LOGOUT'
          ? 'This browser has staff data from a different account. Sign out and review local work before switching accounts.'
          : identityError(nextCode),
      );
      await clearIdentity().catch(() => undefined);
    } finally {
      setPassword('');
      pending.current = false;
      setBusy(false);
    }
  }
  async function redirectSignIn() {
    if (pending.current || !ready) return;
    pending.current = true;
    setBusy(true);
    setMessage('');
    const previousUrl = window.location.pathname + window.location.search;
    try {
      const flow = await authMutation<{ state: string }>(
        '/api/auth/redirect',
        { returnTo: ready.returnTo },
        ready.csrf,
      );
      const context: RedirectContext = {
        csrf: ready.csrf,
        state: flow.state,
        returnTo: ready.returnTo,
        createdAt: Date.now(),
      };
      sessionStorage.setItem(redirectKey, JSON.stringify(context));
      window.history.replaceState(window.history.state, '', '/sign-in?oauth=return');
      await googleRedirect();
    } catch (error) {
      window.history.replaceState(window.history.state, '', previousUrl);
      const nextCode = errorCode(error);
      if (nextCode === 'CSRF_VALIDATION_FAILED') {
        setReady(null);
        load.current = null;
      }
      setCode(nextCode);
      setMessage(
        nextCode === 'CSRF_VALIDATION_FAILED'
          ? identityError(nextCode)
          : 'Redirect sign-in could not start. Allow temporary browser storage and try again, or use the sign-in window.',
      );
      setBusy(false);
      pending.current = false;
    }
  }
  const isInvitation = invitation || ready?.invitation;
  const formHidden = redirectReturn || (invitation && !ready && code === 'INVALID_INVITATION');
  const warn = code === 'EMAIL_NOT_VERIFIED' || code === 'auth/too-many-requests';
  return (
    <>
      <section className={auth.panel} aria-labelledby="auth-heading">
        <h1 id="auth-heading">{isInvitation ? 'Accept your invitation' : 'Sign in'}</h1>
        <p className={auth.lead}>
          {isInvitation
            ? 'Sign in to join the staff workspace.'
            : 'Use your email address and password.'}
        </p>
        {isInvitation && (
          <div className={auth.context}>
            <AuthIcon name="mail" size={20} />
            <p>
              <strong>Use the address your invitation was sent to</strong>
              <span>
                Signing in with that account enables your staff access. Other accounts cannot accept
                it.
              </span>
            </p>
          </div>
        )}
        {!formHidden && (
          <form
            className={auth.form}
            onSubmit={(event) => {
              event.preventDefault();
              void signIn('password');
            }}
          >
            <TextField
              id="sign-in-email"
              label="Email address"
              name="email"
              autoComplete="username"
              placeholder="you@example.com"
              value={email}
              onChange={setEmail}
            />
            <PasswordField
              id="sign-in-password"
              name="password"
              label="Password"
              autoComplete="current-password"
              action={
                !redirectReturn && (
                  <a className={textLink} href="/forgot-password">
                    Forgot password?
                  </a>
                )
              }
              value={password}
              onChange={setPassword}
            />
            {!ready && !message && (
              <p role="status" className={auth.help}>
                Checking sign-in…
              </p>
            )}
            {message && <Notice tone={warn ? 'warning' : 'danger'}>{message}</Notice>}
            {code === 'EMAIL_NOT_VERIFIED' && (
              <a className={textLink} href="/verify-email">
                Send a new verification email
              </a>
            )}
            <button
              type="submit"
              className={auth.primary}
              disabled={busy || (invitation && !ready && !message)}
            >
              {busy ? 'Completing sign-in…' : isInvitation ? 'Sign in and accept' : 'Sign in'}
            </button>
            {googleSignIn && (
              <>
                <div className={auth.divider} aria-hidden="true">
                  or
                </div>
                <button
                  type="button"
                  className={auth.secondary}
                  disabled={busy || (invitation && !ready && !message)}
                  onClick={() => void signIn('google')}
                >
                  {busy
                    ? 'Completing sign-in…'
                    : code === 'INVITATION_ACCOUNT_MISMATCH'
                      ? 'Choose another Google account'
                      : 'Continue with Google'}
                </button>
              </>
            )}
            {code === 'auth/popup-blocked' && redirectAllowed && ready && (
              <button
                type="button"
                className={auth.secondary}
                disabled={busy}
                onClick={() => void redirectSignIn()}
              >
                Continue with a page redirect
              </button>
            )}
          </form>
        )}
        {formHidden && message && <Notice tone="danger">{message}</Notice>}
        {redirectReturn && message && (
          <p className="mt-4 text-sm text-muted">
            <a
              className={textLink}
              href={`/sign-in?returnTo=${encodeURIComponent(recoveryReturnTo)}`}
            >
              Start sign-in again
            </a>{' '}
            If you were accepting an invitation, reopen your original invitation link to refresh its
            sign-in check.
          </p>
        )}
        {invitation && !ready && code === 'INVALID_INVITATION' && (
          <p className="mt-4 text-sm text-muted">
            Reopen your original invitation link to refresh its sign-in check. If you already
            accepted it, use sign-in below.
          </p>
        )}
        {code === 'ACCOUNT_SWITCH_NEEDS_LOGOUT' && (
          <SignOutButton
            namespace={namespace}
            destination="/sign-in"
            label="Review local work and sign out"
          />
        )}
        {isInvitation && (
          <p className={auth.switch}>
            Already accepted? <a href="/sign-in">Sign in to your workspace</a>
          </p>
        )}
        {!invitation && !redirectReturn && (
          <p className={auth.switch}>
            New here? <a href="/register">Create an account</a>
          </p>
        )}
      </section>
      <p className={auth.fine}>
        Your password is never stored in your browser. Sessions last up to five days.
      </p>
    </>
  );
}
