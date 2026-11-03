import test from 'node:test';
import assert from 'node:assert/strict';
import {
  authHelperFiles,
  contentSecurityPolicy,
  publicIdentityConfig,
  redirectSupported,
} from '../../src/lib/auth-security-policy';
const config = {
  loginEnabled: true,
  webOrigin: 'https://journal.example.test',
  identity: {
    apiKey: 'public-key',
    projectId: 'synthetic-project',
    appId: '1:123:web:example',
    authDomain: 'journal.example.test',
  },
  csrfSecret: 'synthetic-secret-never-public',
  backendOrigin: 'https://internal-api.example.test',
};
test('public identity configuration explicitly selects only ordinary SDK fields', () => {
  const json = publicIdentityConfig(config);
  assert.deepEqual(Object.keys(json).sort(), ['identity', 'loginEnabled', 'redirectEnabled']);
  assert.ok(!JSON.stringify(json).includes(config.csrfSecret));
  assert.ok(!JSON.stringify(json).includes(config.backendOrigin));
  assert.deepEqual(publicIdentityConfig({ ...config, loginEnabled: false }), {
    loginEnabled: false,
  });
});
test('redirect fallback requires a same-origin helper or a development emulator', () => {
  assert.equal(redirectSupported(config), true);
  assert.equal(
    redirectSupported({
      ...config,
      identity: { ...config.identity, authDomain: 'other.firebaseapp.com' },
    }),
    false,
  );
  assert.equal(
    redirectSupported({
      ...config,
      identity: { ...config.identity, authDomain: 'localhost' },
      authEmulatorOrigin: 'http://127.0.0.1:9099',
    }),
    true,
  );
  assert.equal(authHelperFiles.has('../arbitrary'), false);
});
test('production CSP permits exact auth endpoints only on auth screens and never unsafe-eval', () => {
  for (const path of ['/sign-in', '/invite', '/__/auth/iframe']) {
    const csp = contentSecurityPolicy(config, path, 'synthetic-nonce', false);
    assert.ok(csp.includes('https://identitytoolkit.googleapis.com'));
    assert.ok(csp.includes('https://journal.example.test'));
    assert.ok(!csp.includes('unsafe-eval'));
    assert.ok(!csp.includes('https:;'));
  }
  const reading = contentSecurityPolicy(config, '/posts/story', 'synthetic-nonce', false);
  assert.ok(!reading.includes('google'));
  assert.ok(reading.includes("frame-ancestors 'none'"));
  assert.ok(
    contentSecurityPolicy(config, '/__/auth/iframe', 'nonce', false).includes(
      "frame-ancestors 'self'",
    ),
  );
});
