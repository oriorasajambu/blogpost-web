'use client';

import { buttonPrimary, eyebrow, studio } from '@/components/ui/styles';
import { useState, type FormEvent } from 'react';
import { authMutation, freshCsrf } from '@/features/auth/client-api';
import { clearIdentity, passwordSignIn } from '@/features/auth/identity-sdk';
import { identityError } from '@/lib/auth-navigation';

function errorCode(error: unknown) {
  return error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
    ? error.code
    : 'UNKNOWN';
}
/**
 * Credential changes. The current password is entered again each time: it gives the API a fresh
 * identity token, so a stolen session alone cannot change how the account is signed in to.
 */
async function changeCredential(
  email: string,
  current: string,
  path: string,
  body: (idToken: string) => Record<string, string>,
) {
  try {
    const credential = await passwordSignIn(email, current);
    const idToken = await credential.user.getIdToken(true);
    const csrf = await freshCsrf();
    await authMutation(path, body(idToken), csrf.token);
  } finally {
    await clearIdentity().catch(() => undefined);
  }
}
function copyFor(code: string) {
  return code === 'auth/invalid-credential' || code === 'auth/wrong-password'
    ? 'The current password is not correct.'
    : identityError(code);
}

export function SecuritySection({ email }: { email: string }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [emailCurrent, setEmailCurrent] = useState('');
  const [busy, setBusy] = useState<'password' | 'email' | null>(null);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  async function onPassword(event: FormEvent) {
    event.preventDefault();
    const length = [...next].length;
    if (length < 12 || length > 128)
      return setPasswordMessage('Use a new password of 12 to 128 characters.');
    if (next !== repeat) return setPasswordMessage('The two new passwords do not match.');
    setBusy('password');
    setPasswordMessage('');
    try {
      await changeCredential(email, current, '/api/account/password', (idToken) => ({
        idToken,
        newPassword: next,
      }));
      // Every session ended, this one included.
      window.location.replace('/sign-in');
    } catch (error) {
      setPasswordMessage(copyFor(errorCode(error)));
    } finally {
      setCurrent('');
      setNext('');
      setRepeat('');
      setBusy(null);
    }
  }
  async function onEmail(event: FormEvent) {
    event.preventDefault();
    setBusy('email');
    setEmailMessage('');
    try {
      await changeCredential(email, emailCurrent, '/api/account/email-change', (idToken) => ({
        idToken,
        newEmail: newEmail.trim(),
      }));
      setEmailSent(true);
    } catch (error) {
      setEmailMessage(copyFor(errorCode(error)));
    } finally {
      setEmailCurrent('');
      setBusy(null);
    }
  }
  return (
    <section className={studio.card} aria-labelledby="security-heading">
      <p className={eyebrow}>Account</p>
      <h2 id="security-heading">Sign-in and security</h2>
      <p>
        Signed in as <strong>{email}</strong>. Enter your current password to change how you sign
        in.
      </p>
      <form className={studio.form} onSubmit={onPassword} aria-labelledby="password-heading">
        <h3 id="password-heading">Change password</h3>
        <label htmlFor="security-current">Current password</label>
        <input
          id="security-current"
          type="password"
          autoComplete="current-password"
          required
          maxLength={128}
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
        <label htmlFor="security-new">New password</label>
        <input
          id="security-new"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={128}
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
        <label htmlFor="security-repeat">Repeat new password</label>
        <input
          id="security-repeat"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={128}
          value={repeat}
          onChange={(e) => setRepeat(e.target.value)}
        />
        <p className={studio.fieldLabel}>
          You will be signed out everywhere and asked to sign in again.
        </p>
        <div className={studio.actions}>
          <button type="submit" className={buttonPrimary} disabled={busy !== null}>
            {busy === 'password' ? 'Changing…' : 'Change password'}
          </button>
        </div>
        {passwordMessage && <p role="alert">{passwordMessage}</p>}
      </form>
      <form className={studio.form} onSubmit={onEmail} aria-labelledby="email-heading">
        <h3 id="email-heading">Change email address</h3>
        {emailSent ? (
          <p role="status">
            We sent a confirmation link to the new address and a notice to the current one. Your
            address changes only after you open the link.
          </p>
        ) : (
          <>
            <label htmlFor="security-email">New email address</label>
            <input
              id="security-email"
              type="email"
              autoComplete="email"
              required
              maxLength={320}
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
            <label htmlFor="security-email-password">Current password</label>
            <input
              id="security-email-password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
              value={emailCurrent}
              onChange={(e) => setEmailCurrent(e.target.value)}
            />
            <div className={studio.actions}>
              <button type="submit" className={buttonPrimary} disabled={busy !== null}>
                {busy === 'email' ? 'Sending…' : 'Send confirmation link'}
              </button>
            </div>
          </>
        )}
        {emailMessage && <p role="alert">{emailMessage}</p>}
      </form>
    </section>
  );
}
