'use client';

import { buttonPrimary, eyebrow, studio, textLink } from '@/components/ui/styles';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { identityError } from '@/lib/auth-navigation';
import { authJson, authMutation, freshCsrf } from './client-api';
import { Captcha } from './captcha';
import { confirmEmailCode } from './identity-sdk';
import { useAuthDocumentPolicy } from './document-policy';

function errorCode(error: unknown) {
  return error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
    ? error.code
    : 'UNKNOWN';
}
/** Shared by the public account forms: the captcha site key, a CSRF token and one submit path. */
/** `captcha` is false for requests already proven by a one-time code. */
export function useAccountRequest(path: string, captcha = true) {
  const [siteKey, setSiteKey] = useState<string | undefined>();
  const [token, setToken] = useState<string | undefined>();
  const [challenge, setChallenge] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!captcha) return;
    let active = true;
    authJson<{ captchaSiteKey?: string }>('/api/public-config')
      .then((config) => active && setSiteKey(config.captchaSiteKey))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [captcha]);
  const onToken = useCallback((value: string | undefined) => setToken(value), []);
  async function submit(body: Record<string, string>) {
    if (busy) return;
    if (siteKey && !token) {
      setMessage(identityError('CAPTCHA_FAILED'));
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const csrf = await freshCsrf();
      await authMutation(path, { ...body, ...(token ? { captchaToken: token } : {}) }, csrf.token);
      setDone(true);
    } catch (error) {
      setMessage(identityError(errorCode(error)));
      // A challenge token is single use.
      setChallenge((value) => value + 1);
    } finally {
      setBusy(false);
    }
  }
  return { siteKey, onToken, challenge, busy, message, done, submit };
}

export function RegisterForm() {
  useAuthDocumentPolicy();
  const request = useAccountRequest('/api/account/register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [problem, setProblem] = useState('');
  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const length = [...password].length;
    if (length < 12 || length > 128) return setProblem('Use a password of 12 to 128 characters.');
    if (password !== confirm) return setProblem('The two passwords do not match.');
    setProblem('');
    void request.submit({ email: email.trim(), password }).finally(() => {
      setPassword('');
      setConfirm('');
    });
  }
  if (request.done)
    return (
      <section className={studio.authPanel} aria-labelledby="register-heading">
        <p className={eyebrow}>Create an account</p>
        <h1 id="register-heading">Check your inbox</h1>
        <p role="status">
          If that address can be registered, we sent a verification link to it. Open the link, then
          wait for an administrator to approve your account.
        </p>
        <p>
          <a className={textLink} href="/sign-in">
            Back to sign-in
          </a>
        </p>
      </section>
    );
  return (
    <section className={studio.authPanel} aria-labelledby="register-heading">
      <p className={eyebrow}>Create an account</p>
      <h1 id="register-heading">Register for the workspace</h1>
      <p>
        Verify your email address, then an administrator approves access. Use a long, unique
        password: at least 12 characters.
      </p>
      <form className={studio.form} onSubmit={onSubmit}>
        <label htmlFor="register-email">Email address</label>
        <input
          id="register-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={320}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <label htmlFor="register-password">Password</label>
        <input
          id="register-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={256}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <label htmlFor="register-confirm">Repeat password</label>
        <input
          id="register-confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={256}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <Captcha siteKey={request.siteKey} onToken={request.onToken} resetKey={request.challenge} />
        <div className={studio.actions}>
          <button type="submit" className={buttonPrimary} disabled={request.busy}>
            {request.busy ? 'Creating account…' : 'Create account'}
          </button>
        </div>
      </form>
      {(problem || request.message) && <p role="alert">{problem || request.message}</p>}
      <p>
        <a className={textLink} href="/sign-in">
          Already registered? Sign in
        </a>
      </p>
    </section>
  );
}

type Applied = 'idle' | 'working' | 'confirmed' | 'failed';
export function VerifyEmailPanel({ code }: { code?: string }) {
  useAuthDocumentPolicy();
  const request = useAccountRequest('/api/account/verify-email/resend');
  const [email, setEmail] = useState('');
  const [applied, setApplied] = useState<Applied>('idle');
  const [failure, setFailure] = useState('');
  async function confirm() {
    if (!code || applied === 'working') return;
    setApplied('working');
    setFailure('');
    try {
      await confirmEmailCode(code);
      setApplied('confirmed');
    } catch (error) {
      setFailure(identityError(errorCode(error)));
      setApplied('failed');
    }
  }
  if (applied === 'confirmed')
    return (
      <section className={studio.authPanel} aria-labelledby="verify-heading">
        <p className={eyebrow}>Email</p>
        <h1 id="verify-heading">Email confirmed</h1>
        <p role="status">
          Your address is verified. If an administrator has not approved your account yet, sign-in
          will say so; try again once you are approved.
        </p>
        <p>
          <a className={buttonPrimary} href="/sign-in">
            Continue to sign-in
          </a>
        </p>
      </section>
    );
  const asking = !code || applied === 'failed';
  return (
    <section className={studio.authPanel} aria-labelledby="verify-heading">
      <p className={eyebrow}>Email</p>
      <h1 id="verify-heading">{asking ? 'Send a new verification email' : 'Confirm your email'}</h1>
      {code && applied !== 'failed' && (
        <>
          <p>Confirm that this is your address to finish setting up your account.</p>
          <div className={studio.actions}>
            <button
              type="button"
              className={buttonPrimary}
              disabled={applied === 'working'}
              onClick={() => void confirm()}
            >
              {applied === 'working' ? 'Confirming…' : 'Confirm my email'}
            </button>
          </div>
        </>
      )}
      {failure && <p role="alert">{failure}</p>}
      {asking &&
        (request.done ? (
          <p role="status">
            If that address has an unverified account, we sent a new verification link to it.
          </p>
        ) : (
          <form
            className={studio.form}
            onSubmit={(event) => {
              event.preventDefault();
              void request.submit({ email: email.trim() });
            }}
          >
            <label htmlFor="verify-email-address">Email address</label>
            <input
              id="verify-email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={320}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Captcha
              siteKey={request.siteKey}
              onToken={request.onToken}
              resetKey={request.challenge}
            />
            <div className={studio.actions}>
              <button type="submit" className={buttonPrimary} disabled={request.busy}>
                {request.busy ? 'Sending…' : 'Send verification email'}
              </button>
            </div>
          </form>
        ))}
      {request.message && <p role="alert">{request.message}</p>}
      <p>
        <a className={textLink} href="/sign-in">
          Back to sign-in
        </a>
      </p>
    </section>
  );
}
