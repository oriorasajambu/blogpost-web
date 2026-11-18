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
