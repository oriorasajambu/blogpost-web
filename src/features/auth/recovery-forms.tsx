'use client';

import { buttonPrimary, eyebrow, studio, textLink } from '@/components/ui/styles';
import { useState } from 'react';
import { identityError } from '@/lib/auth-navigation';
import { Captcha } from './captcha';
import { useAccountRequest } from './account-forms';
import { confirmEmailCode } from './identity-sdk';

function errorCode(error: unknown) {
  return error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
    ? error.code
    : 'UNKNOWN';
}

export function ForgotPasswordPanel() {
  const request = useAccountRequest('/api/account/forgot-password');
  const [email, setEmail] = useState('');
  return (
    <section className={studio.authPanel} aria-labelledby="forgot-heading">
      <p className={eyebrow}>Password</p>
      <h1 id="forgot-heading">Forgot your password?</h1>
      {request.done ? (
        <p role="status">
          If that address has an account, we sent a link to choose a new password. It works once and
          expires in about an hour.
        </p>
      ) : (
        <>
          <p>Enter your email address and we will send a link to choose a new password.</p>
          <form
            className={studio.form}
            onSubmit={(event) => {
              event.preventDefault();
              void request.submit({ email: email.trim() });
            }}
          >
            <label htmlFor="forgot-email">Email address</label>
            <input
              id="forgot-email"
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
                {request.busy ? 'Sending…' : 'Send reset link'}
              </button>
            </div>
          </form>
        </>
      )}
      {request.message && <p role="alert">{request.message}</p>}
      <p>
        <a className={textLink} href="/sign-in">
          Back to sign-in
        </a>
      </p>
    </section>
  );
}

/** `setup` marks the link sent to existing members when sign-in moved to email and password. */
export function ResetPasswordPanel({ code, setup }: { code?: string; setup: boolean }) {
  const request = useAccountRequest('/api/account/reset-password', false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [problem, setProblem] = useState('');
  if (!code)
    return (
      <section className={studio.authPanel} aria-labelledby="reset-heading">
        <p className={eyebrow}>Password</p>
        <h1 id="reset-heading">This link is not valid</h1>
        <p role="alert">The link is incomplete. Request a new one to continue.</p>
        <p>
          <a className={buttonPrimary} href="/forgot-password">
            Request a new link
          </a>
        </p>
      </section>
    );
  if (request.done)
    return (
      <section className={studio.authPanel} aria-labelledby="reset-heading">
        <p className={eyebrow}>Password</p>
        <h1 id="reset-heading">{setup ? 'Password set' : 'Password changed'}</h1>
        <p role="status">
          You were signed out everywhere. Sign in with your new password. If you registered
          recently, an administrator may still need to approve your account.
        </p>
        <p>
          <a className={buttonPrimary} href="/sign-in">
            Continue to sign-in
          </a>
        </p>
      </section>
    );
  return (
    <section className={studio.authPanel} aria-labelledby="reset-heading">
      <p className={eyebrow}>Password</p>
      <h1 id="reset-heading">{setup ? 'Set your password' : 'Choose a new password'}</h1>
      <p>
        {setup
          ? 'Blogpost now signs in with your email address and a password. Choose one to keep your account and posts.'
          : 'Use at least 12 characters. A password that appeared in a data breach is refused.'}
      </p>
      <form
        className={studio.form}
        onSubmit={(event) => {
          event.preventDefault();
          const length = [...password].length;
          if (length < 12 || length > 128)
            return setProblem('Use a password of 12 to 128 characters.');
          if (password !== confirm) return setProblem('The two passwords do not match.');
          setProblem('');
          void request.submit({ code, password }).finally(() => {
            setPassword('');
            setConfirm('');
          });
        }}
      >
        <label htmlFor="reset-password">New password</label>
        <input
          id="reset-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={128}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <label htmlFor="reset-confirm">Repeat password</label>
        <input
          id="reset-confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={128}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <div className={studio.actions}>
          <button type="submit" className={buttonPrimary} disabled={request.busy}>
            {request.busy ? 'Saving…' : 'Save password'}
          </button>
        </div>
      </form>
      {(problem || request.message) && (
        <p role="alert">
          {problem ||
            (request.message === identityError('VALIDATION_FAILED')
              ? 'This link has expired or was already used, or the password was not accepted. Choose a different password, or request a new link.'
              : request.message)}
        </p>
      )}
      <p>
        <a className={textLink} href="/forgot-password">
          Request a new link
        </a>
      </p>
    </section>
  );
}

type Applied = 'idle' | 'working' | 'confirmed' | 'failed';
export function ConfirmEmailChangePanel({ code }: { code?: string }) {
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
  return (
    <section className={studio.authPanel} aria-labelledby="change-heading">
      <p className={eyebrow}>Email</p>
      <h1 id="change-heading">
        {applied === 'confirmed' ? 'Email address changed' : 'Confirm your new email address'}
      </h1>
      {applied === 'confirmed' ? (
        <>
          <p role="status">
            Your sign-in address is updated. Sign in again with the new address and your current
            password.
          </p>
          <p>
            <a className={buttonPrimary} href="/sign-in">
              Continue to sign-in
            </a>
          </p>
        </>
      ) : code ? (
        <>
          <p>Confirm that this address should replace the one on your account.</p>
          <div className={studio.actions}>
            <button
              type="button"
              className={buttonPrimary}
              disabled={applied === 'working'}
              onClick={() => void confirm()}
            >
              {applied === 'working' ? 'Confirming…' : 'Confirm new email'}
            </button>
          </div>
          {failure && (
            <p role="alert">
              {applied === 'failed'
                ? 'This link has expired or was already used. Start the change again from your profile.'
                : failure}
            </p>
          )}
        </>
      ) : (
        <p role="alert">The link is incomplete. Start the change again from your profile.</p>
      )}
    </section>
  );
}
