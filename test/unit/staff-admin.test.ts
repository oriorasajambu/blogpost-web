import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  validateAdminMember,
  validateInvitation,
  validateInvitationIssue,
  validateAuditEvent,
  validateAdminPost,
} from '../../src/features/members/admin-contract';
import {
  captureAdminCommand,
  canRetryAdminCommand,
  uncertainAdminOutcome,
  replayWindow,
} from '../../src/features/members/admin-command';
import { validateProfile, profileValidation } from '../../src/features/profile/profile-contract';

const timestamp = '2026-11-02T10:20:30.000Z';
const author = {
  id: '40000000-0000-4000-8000-000000000003',
  handle: 'synthetic-admin',
  displayName: 'Synthetic admin',
};
const member = {
  ...author,
  bio: '',
  email: 'admin@example.test',
  role: 'ADMIN',
  active: true,
  version: 1,
  createdAt: timestamp,
  updatedAt: timestamp,
};
const invitation = {
  id: '60000000-0000-4000-8000-000000000001',
  email: 'invited@example.test',
  role: 'AUTHOR',
  status: 'PENDING',
  version: 1,
  issuedBy: author,
  createdAt: timestamp,
  expiresAt: '2026-11-09T10:20:30.000Z',
  acceptedAt: null,
  revokedAt: null,
};
const origin = 'https://web.example.test';
const inviteUrl = `${origin}/invitations/accept?token=${'A'.repeat(43)}`;

test('admin member boundaries fail closed on unknown roles, invalid versions and timestamps', () => {
  assert.equal(
    validateAdminMember({ ...member, opaqueProviderSecret: 'never serialized' }).email,
    member.email,
  );
  assert.ok(
    !(
      'opaqueProviderSecret' in
      validateAdminMember({ ...member, opaqueProviderSecret: 'never serialized' })
    ),
  );
  for (const invalid of [
    { role: 'SUPER_ADMIN' },
    { active: 'true' },
    { version: 0 },
    { version: 2147483648 },
    { updatedAt: '2026-02-30T00:00:00.000Z' },
  ])
    assert.throws(() => validateAdminMember({ ...member, ...invalid }));
});

test('invitation receipt requires known status, role and complete typed audit fields', () => {
  assert.equal(validateInvitation(invitation).issuedBy.id, author.id);
  for (const invalid of [
    { status: 'UNKNOWN' },
    { role: 'UNKNOWN' },
    { version: 0 },
    { acceptedAt: 'yesterday' },
    { revokedAt: undefined },
    { email: 'broken email' },
  ])
    assert.throws(() => validateInvitation({ ...invitation, ...invalid }));
});

test('secret invitation links are constrained to the exact configured origin and acceptance route', () => {
  assert.equal(
    validateInvitationIssue({ invitation, inviteUrl, linkAvailable: true }, origin).inviteUrl,
    inviteUrl,
  );
  for (const value of [
    inviteUrl.replace('web.example.test', 'attacker.example'),
    inviteUrl.replace('/invitations/accept', '/studio/admin'),
    `${inviteUrl}&redirect=https://attacker.example`,
    `${inviteUrl}#fragment`,
    `${origin}/invitations/accept?token=short`,
    `${origin}/invitations/accept?token=${'A'.repeat(43)}&token=${'B'.repeat(43)}`,
    `https://user@web.example.test/invitations/accept?token=${'A'.repeat(43)}`,
  ])
    assert.throws(() =>
      validateInvitationIssue({ invitation, inviteUrl: value, linkAvailable: true }, origin),
    );
  assert.throws(() =>
    validateInvitationIssue({ invitation, inviteUrl, linkAvailable: true }, null),
  );
});

test('lost invitation secret is represented as unavailable on successful replay without manufacturing a link', () => {
  assert.deepEqual(
    validateInvitationIssue({ invitation, inviteUrl: null, linkAvailable: false }, origin),
    { invitation, inviteUrl: null, linkAvailable: false },
  );
  assert.throws(() =>
    validateInvitationIssue({ invitation, inviteUrl: null, linkAvailable: true }, origin),
  );
  assert.throws(() =>
    validateInvitationIssue({ invitation, inviteUrl, linkAvailable: false }, origin),
  );
});

test('audit metadata preserves bounded server changes as text data and omits unknown envelope fields', () => {
  const audit = {
    id: '70000000-0000-4000-8000-000000000001',
    actor: author,
    action: 'MEMBER_UPDATED',
    subjectType: 'MEMBER',
    subjectId: member.id,
    createdAt: timestamp,
    changes: {
      role: { from: 'AUTHOR', to: 'EDITOR' },
      literal: '<script>ignored-as-text</script>',
    },
    privateTrace: 'ignored',
  };
  const parsed = validateAuditEvent(audit);
  assert.deepEqual(parsed.changes, audit.changes);
  assert.ok(!('privateTrace' in parsed));
  assert.throws(() => validateAuditEvent({ ...audit, changes: [] }));
  assert.throws(() => validateAuditEvent({ ...audit, changes: { large: 'x'.repeat(65537) } }));
});

test('uncertain administrative retries capture immutable input and retain the original version/key', () => {
  const input = {
    path: '/admin/members/40000000-0000-4000-8000-000000000001',
    method: 'PATCH' as const,
    content: { role: 'EDITOR' },
    version: 7,
  };
  const command = captureAdminCommand(input, '80000000-0000-4000-8000-000000000001', 1000);
  input.content.role = 'ADMIN';
  input.version = 8;
  assert.deepEqual(command.content, { role: 'EDITOR' });
  assert.equal(command.version, 7);
  assert.equal(command.startedAt, 1000);
  assert.ok(canRetryAdminCommand(command, 1000));
  assert.ok(canRetryAdminCommand(command, 1000 + replayWindow - 1));
  assert.ok(!canRetryAdminCommand(command, 1000 + replayWindow));
  assert.ok(!canRetryAdminCommand(command, 999));
  for (const error of [
    { status: 0 },
    { status: 503 },
    { status: 409, code: 'IDEMPOTENCY_IN_PROGRESS' },
    { status: 502, code: 'INVALID_API_RESPONSE' },
  ])
    assert.ok(uncertainAdminOutcome(error));
  for (const error of [
    { status: 412, code: 'VERSION_CONFLICT' },
    { status: 409, code: 'LAST_ADMIN_REQUIRED' },
    { status: 403, code: 'INSUFFICIENT_PERMISSION' },
  ])
    assert.ok(!uncertainAdminOutcome(error));
  assert.ok(uncertainAdminOutcome({ status: 403, code: 'CSRF_VALIDATION_FAILED' }, true));
  assert.ok(uncertainAdminOutcome({ status: 426, code: 'CLIENT_UPDATE_REQUIRED' }, true));
});

test('administrative detail responses must match the selected resource and invitation proposal', () => {
  const otherId = '40000000-0000-4000-8000-000000000004';
  assert.equal(validateAdminMember(member, member.id).id, member.id);
  assert.throws(() => validateAdminMember(member, otherId));
  assert.throws(() => validateInvitation(invitation, otherId));
  assert.equal(validateProfile(member, member.id).id, member.id);
  assert.throws(() => validateProfile(member, otherId));
  const result = { invitation, inviteUrl, linkAvailable: true };
  assert.equal(
    validateInvitationIssue(result, origin, {
      email: invitation.email.toUpperCase(),
      role: invitation.role as 'AUTHOR',
    }).invitation.email,
    invitation.email,
  );
  assert.throws(() =>
    validateInvitationIssue(result, origin, { email: 'other@example.test', role: 'AUTHOR' }),
  );
  assert.throws(() =>
    validateInvitationIssue(result, origin, { email: invitation.email, role: 'ADMIN' }),
  );
  assert.throws(() =>
    validateInvitationIssue(result, origin, {
      email: invitation.email,
      role: 'AUTHOR',
      previousId: invitation.id,
    }),
  );
  const contract = JSON.parse(
    readFileSync(new URL('../../contracts/openapi-v1.0.0.json', import.meta.url), 'utf8'),
  );
  const post =
    contract.paths['/v1/posts/{postId}'].get.responses['200'].content['application/json'].examples
      .success.value.data;
  assert.equal(validateAdminPost(post, post.id).id, post.id);
  assert.throws(() => validateAdminPost(post, otherId));
});

test('public profile input counts complete Unicode scalars rather than UTF-16 units', () => {
  assert.equal(profileValidation('😀'.repeat(80), '😀'.repeat(500)), null);
  assert.ok(profileValidation('😀'.repeat(81), ''));
  assert.ok(profileValidation('Valid', '😀'.repeat(501)));
  assert.ok(profileValidation('  ', ''));
  assert.ok(profileValidation('\ud800', ''));
  assert.ok(profileValidation('Valid', '\udc00'));
});
