import test from 'node:test';
import assert from 'node:assert/strict';
import { identityError, safeReturnTo, staffNavigation } from '../../src/lib/auth-navigation';

test('sign-in return paths permit normalized staff locations and reject foreign or ambiguous navigation', () => {
  assert.equal(safeReturnTo('/studio/posts?filter=mine'), '/studio/posts?filter=mine');
  for (const value of [
    'https://attacker.invalid/studio',
    '//attacker.invalid',
    '/\\attacker.invalid',
    '/studio/../../sign-in',
    '/studio/%2e%2e/sign-in',
    '/studio/posts#draft',
    '/studio\n/posts',
    '/studio-other',
    undefined,
    ['one', 'two'],
  ]) {
    assert.equal(safeReturnTo(value), '/studio/posts', String(value));
  }
});
test('staff navigation follows the fixed role boundary and unknown roles expose no privileged links', () => {
  const paths = (role: string) => staffNavigation(role).map((entry) => entry.href);
  assert.deepEqual(paths('AUTHOR'), ['/studio/posts', '/studio/profile']);
  assert.deepEqual(paths('EDITOR'), [
    '/studio/posts',
    '/studio/profile',
    '/studio/review',
    '/studio/taxonomy',
  ]);
  assert.ok(paths('ADMIN').includes('/studio/admin'));
  assert.deepEqual(paths('OWNER'), []);
});
test('identity failure copy distinguishes cancellation, blocking, invitation mismatch and access denial', () => {
  assert.match(identityError('auth/popup-closed-by-user'), /cancelled/);
  assert.match(identityError('auth/popup-blocked'), /blocked/);
  assert.match(identityError('INVITATION_ACCOUNT_MISMATCH'), /invitation has not been used/);
  assert.match(identityError('INVITATION_EXPIRED'), /expired/);
  assert.match(identityError('INVITATION_USED'), /no longer available/);
  assert.match(identityError('ACCESS_REVOKED'), /access.*unavailable/);
  assert.match(identityError('SOME_NEW_ERROR'), /couldn’t complete sign-in/);
});
