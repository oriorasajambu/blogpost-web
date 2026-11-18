'use client';

import { auth } from '@/components/ui/styles';
import { useState } from 'react';
import { identityError } from '@/lib/auth-navigation';
import { Captcha } from './captcha';
import { useAccountRequest } from './account-forms';
import { confirmEmailCode } from './identity-sdk';
import { useAuthDocumentPolicy } from './document-policy';
import { AuthIcon, Notice, PasswordField, SentCard, TextField } from './auth-ui';

function errorCode(error: unknown) {
  return error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
    ? error.code
    : 'UNKNOWN';
}

export function ForgotPasswordPanel() {
  useAuthDocumentPolicy();
  const request = useAccountRequest('/api/account/forgot-password');
  const [email, setEmail] = useState('');
  if (request.done)
    return (
      <SentCard
        headingId="forgot-heading"
        title="Check your inbox"
        onReset={request.reset}
        extra={
          <p className={auth.next}>
            <strong>Nothing arrived?</strong>
            <br />
            Check your spam folder, or make sure the address is spelled correctly.
          </p>
        }
      >
        If that address has an account, we sent a link to choose a new password. It works once and
        expires in about an hour.
      </SentCard>
    );
  return (
    <section className={auth.panel} aria-labelledby="forgot-heading">
      <h1 id="forgot-heading">Reset your password</h1>
      <p className={auth.lead}>
        Enter your email address and we will send a link to choose a new password. Use this too if
        you have never set one.
      </p>
      <form
        className={auth.form}
        onSubmit={(event) => {
          event.preventDefault();
          void request.submit({ email: email.trim() });
        }}
      >
        <TextField
          id="forgot-email"
          label="Email address"
          name="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={setEmail}
        />
        <Captcha siteKey={request.siteKey} onToken={request.onToken} resetKey={request.challenge} />
        {request.message && <Notice tone="danger">{request.message}</Notice>}
        <button type="submit" className={auth.primary} disabled={request.busy}>
          {request.busy ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
      <p className={auth.switch}>
        <a href="/sign-in">Back to sign in</a>
      </p>
    </section>
  );
}

/** `setup` marks the link sent to existing members when sign-in moved to email and password. */
export function ResetPasswordPanel({ code, setup }: { code?: string; setup: boolean }) {
  useAuthDocumentPolicy();
  const request = useAccountRequest('/api/account/reset-password', false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [problem, setProblem] = useState<{ field: 'password' | 'confirm'; text: string } | null>(
    null,
  );
  if (!code)
    return (
      <section className={auth.panel} aria-labelledby="reset-heading">
        <h1 id="reset-heading">This link is not valid</h1>
        <div className="mt-6">
          <Notice tone="danger">The link is incomplete. Request a new one to continue.</Notice>
        </div>
        <a className={`${auth.primary} mt-5`} href="/forgot-password">
          Request a new link
        </a>
      </section>
    );
  if (request.done)
    return (
      <section className={`${auth.panel} ${auth.sent}`} aria-labelledby="reset-heading">
        <div className={auth.sentIcon}>
          <AuthIcon name="check" size={26} />
        </div>
        <h1 id="reset-heading">{setup ? 'Password set' : 'Password changed'}</h1>
        <p role="status" className={`${auth.lead} mb-6`}>
          You were signed out everywhere. Sign in with your new password. If you registered
          recently, an administrator may still need to approve your account.
        </p>
        <a className={auth.primary} href="/sign-in">
          Continue to sign in
        </a>
      </section>
    );
  return (
    <section className={auth.panel} aria-labelledby="reset-heading">
      <h1 id="reset-heading">{setup ? 'Set your password' : 'Choose a new password'}</h1>
      <p className={auth.lead}>
        {setup
          ? 'Blogpost now signs in with your email address and a password. Choose one to keep your account and posts.'
          : 'Use at least 12 characters. A password that appeared in a data breach is refused.'}
      </p>
      <form
        className={auth.form}
        onSubmit={(event) => {
          event.preventDefault();
          const length = [...password].length;
          if (length < 12 || length > 128)
            return setProblem({
              field: 'password',
              text: 'Use a password of 12 to 128 characters.',
            });
          if (password !== confirm)
            return setProblem({ field: 'confirm', text: 'The two passwords do not match.' });
          setProblem(null);
          void request.submit({ code, password }).finally(() => {
            setPassword('');
            setConfirm('');
          });
        }}
      >
        <PasswordField
          id="reset-password"
          name="password"
          label="New password"
          autoComplete="new-password"
          minLength={12}
          hint="At least 12 characters. A long passphrase works best."
          error={problem?.field === 'password' ? problem.text : undefined}
          value={password}
          onChange={setPassword}
        />
        <PasswordField
          id="reset-confirm"
          name="confirm"
          label="Repeat password"
          autoComplete="new-password"
          minLength={12}
          error={problem?.field === 'confirm' ? problem.text : undefined}
          value={confirm}
          onChange={setConfirm}
        />
        {request.message && (
          <Notice tone="danger">
            {request.message === identityError('VALIDATION_FAILED')
              ? 'This link has expired or was already used, or the password was not accepted. Choose a different password, or request a new link.'
              : request.message}
          </Notice>
        )}
        <button type="submit" className={auth.primary} disabled={request.busy}>
          {request.busy ? 'Saving…' : 'Save password'}
        </button>
      </form>
      <p className={auth.switch}>
        <a href="/forgot-password">Request a new link</a>
      </p>
    </section>
  );
}

type Applied = 'idle' | 'working' | 'confirmed' | 'failed';
export function ConfirmEmailChangePanel({ code }: { code?: string }) {
  useAuthDocumentPolicy();
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
      <section className={`${auth.panel} ${auth.sent}`} aria-labelledby="change-heading">
        <div className={auth.sentIcon}>
          <AuthIcon name="check" size={26} />
        </div>
        <h1 id="change-heading">Email address changed</h1>
        <p role="status" className={`${auth.lead} mb-6`}>
          Your sign-in address is updated. Sign in again with the new address and your current
          password.
        </p>
        <a className={auth.primary} href="/sign-in">
          Continue to sign in
        </a>
      </section>
    );
  return (
    <section className={auth.panel} aria-labelledby="change-heading">
      <h1 id="change-heading">Confirm your new email address</h1>
      {code ? (
        <>
          <p className={auth.lead}>
            Confirm that this address should replace the one on your account.
          </p>
          <div className={auth.form}>
            {failure && (
              <Notice tone="danger">
                {applied === 'failed'
                  ? 'This link has expired or was already used. Start the change again from your profile.'
                  : failure}
              </Notice>
            )}
            <button
              type="button"
              className={auth.primary}
              disabled={applied === 'working'}
              onClick={() => void confirm()}
            >
              {applied === 'working' ? 'Confirming…' : 'Confirm new email'}
            </button>
          </div>
        </>
      ) : (
        <Notice tone="danger">
          The link is incomplete. Start the change again from your profile.
        </Notice>
      )}
    </section>
  );
}
