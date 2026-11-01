import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthFlow, decryptAuthFlow } from '../../src/lib/auth-flow-policy';

const secret = 'synthetic-test-secret-'.repeat(3);
const now = Date.parse('2026-10-29T12:00:00Z');
test('invitation continuity encrypts the token and binds the receipt to a session and expiry', () => {
  const token = 'x'.repeat(43);
  const { value, flow } = createAuthFlow(
    secret,
    'session-one',
    { invitationToken: token, returnTo: '/studio/profile', kind: 'redirect' },
    now,
  );
  assert.ok(!value.includes(token));
  assert.equal(decryptAuthFlow(value, secret, 'session-one', now)?.invitationToken, token);
  assert.equal(decryptAuthFlow(value, secret, 'session-two', now), null);
  assert.equal(decryptAuthFlow(value, secret, 'session-one', flow.expiresAt), null);
  assert.equal(decryptAuthFlow(value, 'another-key', 'session-one', now), null);
});
test('flow receipts reject tampering, oversized values and invalid invitation syntax', () => {
  const { value } = createAuthFlow(secret, '', { kind: 'redirect' }, now);
  const tampered = value.slice(0, -5) + (value.at(-5) === 'A' ? 'B' : 'A') + value.slice(-4);
  assert.equal(decryptAuthFlow(tampered, secret, '', now), null);
  assert.equal(decryptAuthFlow('a'.repeat(4097), secret, '', now), null);
  assert.throws(() =>
    createAuthFlow(secret, '', { kind: 'invitation', invitationToken: '../unsafe' }, now),
  );
});
test('flow return paths use the shared staff-only navigation policy', () => {
  for (const returnTo of [
    'https://attacker.invalid',
    '//attacker.invalid',
    '/\\attacker.invalid',
    '/sign-in',
    '/studio/%0a',
  ]) {
    const { flow } = createAuthFlow(secret, '', { kind: 'redirect', returnTo }, now);
    assert.ok(flow.returnTo.startsWith('/studio'));
  }
});
