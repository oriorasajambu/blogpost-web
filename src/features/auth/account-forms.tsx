'use client';

import { auth } from '@/components/ui/styles';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { identityError } from '@/lib/auth-navigation';
import { authJson, authMutation, freshCsrf } from './client-api';
import { Captcha } from './captcha';
import { confirmEmailCode } from './identity-sdk';
import { useAuthDocumentPolicy } from './document-policy';
import { AuthIcon, FieldError, Notice, PasswordField, SentCard, TextField } from './auth-ui';

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
  /** Back to the form after an answer that always reads the same. */
  function reset() {
    setDone(false);
    setMessage('');
    setChallenge((value) => value + 1);
  }
  return { siteKey, onToken, challenge, busy, message, done, submit, reset };
}

type Problem = { field: 'password' | 'confirm'; text: string } | null;

export function RegisterForm() {
  useAuthDocumentPolicy();
  const request = useAccountRequest('/api/account/register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [problem, setProblem] = useState<Problem>(null);
  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const length = [...password].length;
    if (length < 12 || length > 128)
      return setProblem({ field: 'password', text: 'Use a password of 12 to 128 characters.' });
    if (password !== confirm)
      return setProblem({ field: 'confirm', text: 'The two passwords do not match.' });
    setProblem(null);
    void request.submit({ email: email.trim(), password }).finally(() => {
      setPassword('');
      setConfirm('');
    });
  }
  if (request.done)
    return (
      <SentCard
        headingId="register-heading"
        title="Check your inbox"
        onReset={request.reset}
        extra={
          <p className={auth.next}>
            <strong>What happens next</strong>
            <br />
            Open the link to verify your address. An administrator then approves your access, and
            you can sign in.
          </p>
        }
      >
        If that address can be registered, we sent a verification link to it.
      </SentCard>
    );
  return (
    <section className={auth.panel} aria-labelledby="register-heading">
      <h1 id="register-heading">Create your account</h1>
      <p className={auth.lead}>Verify your email, then an administrator approves your access.</p>
      <form className={auth.form} onSubmit={onSubmit}>
        <TextField
          id="register-email"
          label="Email address"
          name="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={setEmail}
        />
        <PasswordField
          id="register-password"
          name="password"
          label="Password"
          autoComplete="new-password"
          minLength={12}
          hint="At least 12 characters. A long passphrase works best."
          error={problem?.field === 'password' ? problem.text : undefined}
          value={password}
          onChange={setPassword}
        />
        <PasswordField
          id="register-confirm"
          name="confirm"
          label="Repeat password"
          autoComplete="new-password"
          minLength={12}
          error={problem?.field === 'confirm' ? problem.text : undefined}
          value={confirm}
          onChange={setConfirm}
        />
        <Captcha siteKey={request.siteKey} onToken={request.onToken} resetKey={request.challenge} />
        {request.message && <Notice tone="danger">{request.message}</Notice>}
        <button type="submit" className={auth.primary} disabled={request.busy}>
          {request.busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className={auth.switch}>
        Already have an account? <a href="/sign-in">Sign in</a>
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
      <section className={`${auth.panel} ${auth.sent}`} aria-labelledby="verify-heading">
        <div className={auth.sentIcon}>
          <AuthIcon name="check" size={26} />
        </div>
        <h1 id="verify-heading">Email confirmed</h1>
        <p role="status" className={`${auth.lead} mb-6`}>
          Your address is verified. If an administrator has not approved your account yet, sign-in
          will say so; try again once you are approved.
        </p>
        <a className={auth.primary} href="/sign-in">
          Continue to sign in
        </a>
      </section>
    );
  const asking = !code || applied === 'failed';
  if (asking && request.done)
    return (
      <SentCard headingId="verify-heading" title="Check your inbox" onReset={request.reset}>
        If that address has an unverified account, we sent a new verification link to it.
      </SentCard>
    );
  return (
    <section className={auth.panel} aria-labelledby="verify-heading">
      <h1 id="verify-heading">{asking ? 'Send a new verification email' : 'Confirm your email'}</h1>
      {code && applied !== 'failed' && (
        <>
          <p className={auth.lead}>
            Confirm that this is your address to finish setting up your account.
          </p>
          <button
            type="button"
            className={auth.primary}
            disabled={applied === 'working'}
            onClick={() => void confirm()}
          >
            {applied === 'working' ? 'Confirming…' : 'Confirm my email'}
          </button>
        </>
      )}
      {asking && (
        <>
          {failure && (
            <div className="mb-5">
              <Notice tone="danger">{failure}</Notice>
            </div>
          )}
          <p className={auth.lead}>Enter your address and we will send a new link.</p>
          <form
            className={auth.form}
            onSubmit={(event) => {
              event.preventDefault();
              void request.submit({ email: email.trim() });
            }}
          >
            <TextField
              id="verify-email-address"
              label="Email address"
              name="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={setEmail}
            />
            <Captcha
              siteKey={request.siteKey}
              onToken={request.onToken}
              resetKey={request.challenge}
            />
            {request.message && <Notice tone="danger">{request.message}</Notice>}
            <button type="submit" className={auth.primary} disabled={request.busy}>
              {request.busy ? 'Sending…' : 'Send verification email'}
            </button>
          </form>
        </>
      )}
      {!asking && failure && <FieldError>{failure}</FieldError>}
      <p className={auth.switch}>
        <a href="/sign-in">Back to sign in</a>
      </p>
    </section>
  );
}
