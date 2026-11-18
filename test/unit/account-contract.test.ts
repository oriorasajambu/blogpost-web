import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRegistration, validateVerificationResend } from '../../src/lib/auth-contract';
import { parseConfig } from '../../src/lib/config-policy';

const password = 'a long enough passphrase';
test('registration accepts only a bounded email, password and optional captcha token', () => {
  assert.deepEqual(validateRegistration({ email: ' a@example.test ', password }), {
    email: 'a@example.test',
    password,
  });
  assert.equal(
    validateRegistration({ email: 'a@example.test', password, captchaToken: 'token' }).captchaToken,
    'token',
  );
  assert.equal(
    [...validateRegistration({ email: 'a@example.test', password: '😀'.repeat(12) }).password]
      .length,
    12,
  );
  for (const invalid of [
    null,
    [],
    {},
    { email: 'a@example.test' },
    { password },
    { email: 'not-an-email', password },
    { email: 'a@example.test', password: 'short' },
    { email: 'a@example.test', password: 'x'.repeat(129) },
    { email: 'a@example.test', password: 'abc\0defghijklmn' },
    { email: 'a@example.test', password, captchaToken: '' },
    { email: 'a@example.test', password, captchaToken: 'x'.repeat(2049) },
    { email: 'a@example.test', password, role: 'ADMIN' },
    { email: 'a@example.test', password: 12345678901234 },
  ])
    assert.throws(() => validateRegistration(invalid), JSON.stringify(invalid)?.slice(0, 40));
});
test('verification resend takes only an email and an optional captcha token', () => {
  assert.deepEqual(validateVerificationResend({ email: 'a@example.test' }), {
    email: 'a@example.test',
  });
  for (const invalid of [null, {}, { email: 'x' }, { email: 'a@example.test', password }])
    assert.throws(() => validateVerificationResend(invalid));
});
test('the captcha site key is optional public configuration and must look like one', () => {
  const env = {
    APP_ENV: 'development',
    BACKEND_ORIGIN: 'http://localhost:4010',
    WEB_ORIGIN: 'http://localhost:3000',
    WEB_LOGIN_ENABLED: 'true',
    WEB_CSRF_SECRET: 'x'.repeat(40),
    IDENTITY_AUTH_DOMAIN: 'localhost',
    IDENTITY_PROJECT_ID: 'demo-blogpost',
    IDENTITY_WEB_APP_ID: '1:123:web:abc',
    IDENTITY_WEB_API_KEY: 'public-key',
    IDENTITY_AUTH_EMULATOR_ORIGIN: 'http://127.0.0.1:9099',
  } as unknown as NodeJS.ProcessEnv;
  assert.equal(parseConfig(env).captchaSiteKey, undefined);
  assert.equal(
    parseConfig({ ...env, TURNSTILE_SITE_KEY: '0x4AAAAAAAabcdef' }).captchaSiteKey,
    '0x4AAAAAAAabcdef',
  );
  assert.throws(() => parseConfig({ ...env, TURNSTILE_SITE_KEY: 'bad key!' }));
});

import {
  validateEmailChange,
  validatePasswordChange,
  validatePasswordReset,
  resetCodePattern,
} from '../../src/lib/auth-contract';

const code = 'A1b2C3d4E5f6G7h8I9j0_-Kk';
test('password reset takes exactly a URL-safe code and a bounded password', () => {
  assert.deepEqual(validatePasswordReset({ code, password }), { code, password });
  assert.match(code, resetCodePattern);
  for (const invalid of [
    null,
    {},
    { code },
    { password },
    { code: 'short', password },
    { code: code + '/..', password },
    { code, password: 'short' },
    { code, password: 'x'.repeat(129) },
    { code, password, extra: true },
  ])
    assert.throws(() => validatePasswordReset(invalid), JSON.stringify(invalid)?.slice(0, 40));
});
test('credential changes take exactly a proof token plus the new value', () => {
  assert.deepEqual(validatePasswordChange({ idToken: 'token.value', newPassword: password }), {
    idToken: 'token.value',
    newPassword: password,
  });
  assert.deepEqual(validateEmailChange({ idToken: 'token.value', newEmail: ' b@example.test ' }), {
    idToken: 'token.value',
    newEmail: 'b@example.test',
  });
  for (const invalid of [
    {},
    { idToken: 'token' },
    { idToken: '', newPassword: password },
    { idToken: 'token', newPassword: 'short' },
    { idToken: 'token', newPassword: password, newEmail: 'b@example.test' },
  ])
    assert.throws(() => validatePasswordChange(invalid));
  for (const invalid of [
    {},
    { idToken: 'token', newEmail: 'not-an-email' },
    { idToken: 'has space', newEmail: 'b@example.test' },
    { idToken: 'token', newEmail: 'b@example.test', password },
  ])
    assert.throws(() => validateEmailChange(invalid));
});

import { validatePasswordSetupResult } from '../../src/features/members/admin-contract';

test('the Google sign-in switch defaults on and accepts only true or false', () => {
  const env = {
    APP_ENV: 'development',
    BACKEND_ORIGIN: 'http://localhost:4010',
    WEB_ORIGIN: 'http://localhost:3000',
    WEB_LOGIN_ENABLED: 'false',
  } as unknown as NodeJS.ProcessEnv;
  assert.equal(parseConfig(env).googleSignIn, true);
  assert.equal(parseConfig({ ...env, WEB_GOOGLE_SIGN_IN_ENABLED: 'false' }).googleSignIn, false);
  assert.equal(parseConfig({ ...env, WEB_GOOGLE_SIGN_IN_ENABLED: 'true' }).googleSignIn, true);
  assert.throws(() => parseConfig({ ...env, WEB_GOOGLE_SIGN_IN_ENABLED: 'no' }));
});
test('password setup results are two bounded counts', () => {
  assert.deepEqual(validatePasswordSetupResult({ queued: 3, skipped: 0, extra: 'ignored' }), {
    queued: 3,
    skipped: 0,
  });
  for (const invalid of [
    null,
    {},
    { queued: 1 },
    { queued: -1, skipped: 0 },
    { queued: 1.5, skipped: 0 },
    { queued: '1', skipped: 0 },
  ])
    assert.throws(() => validatePasswordSetupResult(invalid));
});
