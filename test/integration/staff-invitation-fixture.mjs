// Executed only inside the disposable staff API container. No usable token is emitted.
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { DatabaseService } from '../src/platform/database/database.service.js';

const database = new DatabaseService();
const stateFile = '/tmp/web-staff-list-fixture.json';
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
let previous;
try {
  previous = JSON.parse(await readFile(stateFile, 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
try {
  const action = process.argv[2];
  if (action === 'staff-list-seed') {
    assert.ok(!previous || previous.cleaned, 'Clean the preceding owned list fixture first');
    const identity = JSON.parse(await readFile('/tmp/web-identity-fixture.json', 'utf8'));
    const actorId = identity.accounts.admin.memberId;
    assert.match(actorId, uuid);
    const suffix = randomUUID();
    const subjectId = randomUUID();
    const now = Date.now();
    const members = Array.from({ length: 25 }, (_, index) => ({
      id: randomUUID(),
      identityUid: `staff-page-${suffix}-${index}`,
      email: `staff-page-${suffix}-${index}@example.test`,
      displayName: `Pagination member ${index} ${suffix.slice(0, 8)}`,
      handle: `staff-page-${suffix}-${index}`,
      bio: '',
      role: 'AUTHOR',
      active: true,
      createdAt: new Date(now - index * 1000),
      updatedAt: new Date(now - index * 1000),
    }));
    const invitations = Array.from({ length: 25 }, (_, index) => ({
      id: randomUUID(),
      email: `invite-page-${suffix}-${index}@example.test`,
      role: 'AUTHOR',
      tokenHash: randomBytes(32).toString('hex'),
      issuerId: actorId,
      createdAt: new Date(now - index * 1000),
      expiresAt: new Date(now + 7 * 86_400_000),
    }));
    const events = Array.from({ length: 25 }, (_, index) => ({
      id: randomUUID(),
      actorId,
      action: 'STAFF_LIST_FIXTURE',
      subjectType: 'MEMBER',
      subjectId,
      changes: { fixture: 'staff cursor pagination', index },
      traceId: randomBytes(16).toString('hex'),
      createdAt: new Date(now - index * 1000),
    }));
    await database.prisma.$transaction(async (tx) => {
      await tx.member.createMany({ data: members });
      await tx.invitation.createMany({ data: invitations });
      await tx.auditEvent.createMany({ data: events });
    });
    const state = {
      members: members.map(({ id }) => id),
      invitations: invitations.map(({ id }) => id),
      events: events.map(({ id }) => id),
      cleaned: false,
    };
    await writeFile(stateFile, JSON.stringify(state), { mode: 0o600 });
    console.log(
      JSON.stringify({
        members: members.map(({ id, email, displayName }) => ({ id, email, displayName })),
        invitations: invitations.map(({ id, email }) => ({ id, email })),
        audit: { subjectId, eventCount: events.length, action: 'STAFF_LIST_FIXTURE' },
      }),
    );
  } else if (action === 'staff-list-cleanup') {
    assert.ok(previous && !previous.cleaned, 'An owned list fixture is required');
    for (const key of ['members', 'invitations', 'events']) {
      assert.equal(previous[key].length, 25);
      assert.equal(new Set(previous[key]).size, 25);
      previous[key].forEach((id) => assert.match(id, uuid));
    }
    const removed = await database.prisma.$transaction(async (tx) => ({
      events: (await tx.auditEvent.deleteMany({ where: { id: { in: previous.events } } })).count,
      invitations: (await tx.invitation.deleteMany({ where: { id: { in: previous.invitations } } }))
        .count,
      members: (await tx.member.deleteMany({ where: { id: { in: previous.members } } })).count,
    }));
    for (const count of Object.values(removed)) assert.equal(count, 25);
    await writeFile(stateFile, JSON.stringify({ ...previous, cleaned: true }), { mode: 0o600 });
    console.log(JSON.stringify({ cleaned: true, removed }));
  } else throw new Error('Unsupported owned staff list fixture action');
} finally {
  await database.onModuleDestroy();
}
