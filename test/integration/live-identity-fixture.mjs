// Runs only inside the disposable backend container; no fixture credential enters app source.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { DatabaseService } from '../src/platform/database/database.service.js';

const stateFile = '/tmp/web-identity-fixture.json';
const action = process.argv[2];
const label = process.argv[3] ?? 'author';
const database = new DatabaseService();
const fixtureApp = initializeApp(
  { projectId: process.env.IDENTITY_PROJECT_ID },
  `web-identity-${randomUUID()}`,
);
const admin = getAuth(fixtureApp);
const metadata = {
  'X-Device-ID': randomUUID(),
  'X-Device-OS': 'UNKNOWN',
  'X-Device-Version': 'unknown',
  'X-App-Version': '0.0.0+web.identity',
  'X-App-Language': 'en',
};
let state;
function mutate(token, patch) {
  const parts = token.split('.');
  parts[1] = Buffer.from(
    JSON.stringify({ ...JSON.parse(Buffer.from(parts[1], 'base64url')), ...patch }),
  ).toString('base64url');
  return parts.join('.');
}
async function google(account) {
  const now = Math.floor(Date.now() / 1000);
  const raw = [
    Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url'),
    Buffer.from(
      JSON.stringify({
        iss: 'https://accounts.google.com',
        sub: account.subject,
        aud: 'disposable-google-client',
        email: account.email,
        email_verified: true,
        iat: now,
        exp: now + 3600,
      }),
    ).toString('base64url'),
    '',
  ].join('.');
  const response = await fetch(
    'http://auth:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=disposable',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        requestUri: 'http://localhost',
        returnSecureToken: true,
        postBody: new URLSearchParams({ providerId: 'google.com', id_token: raw }).toString(),
      }),
      signal: AbortSignal.timeout(10000),
    },
  );
  assert.equal(response.status, 200, 'Synthetic Google sign-in failed');
  const result = await response.json();
  return { uid: result.localId, idToken: result.idToken };
}
async function backend(path, method, body, account = state.accounts.admin) {
  const credential = await google(account);
  const response = await fetch(`http://127.0.0.1:8080${path}`, {
    method,
    headers: {
      ...metadata,
      authorization: `Bearer ${credential.idToken}`,
      'content-type': 'application/json',
      'Idempotency-Key': randomUUID(),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json();
  assert.ok(response.ok, `${method} ${path}: ${response.status} ${result.error?.code}`);
  return result.data;
}
function publicState() {
  return {
    accounts: Object.fromEntries(
      Object.entries(state.accounts).map(([key, account]) => [
        key,
        { uid: account.uid, memberId: account.memberId, email: account.email, role: account.role },
      ]),
    ),
    invitations: Object.fromEntries(
      Object.entries(state.invitations).map(([key, invitation]) => [
        key,
        { id: invitation.id, email: invitation.email },
      ]),
    ),
  };
}
try {
  if (action === 'seed') {
    state = { accounts: {}, invitations: {} };
    for (const [key, role] of Object.entries({
      author: 'AUTHOR',
      other: 'AUTHOR',
      editor: 'EDITOR',
      admin: 'ADMIN',
      outsider: null,
      invitee: null,
      mismatch: null,
      target: null,
      expired: null,
    })) {
      const account = {
        subject: randomUUID(),
        email: `web-${key}-${randomUUID()}@example.test`,
        role,
      };
      const credential = await google(account);
      account.uid = credential.uid;
      if (role) {
        const row = await database.prisma.member.create({
          data: {
            identityUid: account.uid,
            email: account.email,
            role,
            displayName: `Identity ${role}`,
            handle: `identity-${key}`,
            bio: 'Synthetic identity integration profile.',
          },
        });
        account.memberId = row.id;
      }
      state.accounts[key] = account;
    }
    for (const key of ['invitee', 'target', 'expired']) {
      const issued = await backend('/v1/admin/invitations', 'POST', {
        email: state.accounts[key].email,
        role: 'AUTHOR',
      });
      const token = new URL(issued.inviteUrl).searchParams.get('token');
      assert.match(token, /^[A-Za-z0-9_-]{43}$/);
      state.invitations[key] = {
        id: issued.invitation.id,
        email: issued.invitation.email,
        token,
        key: randomUUID(),
      };
    }
    state.privatePost = await backend(
      '/v1/posts',
      'POST',
      {
        clientDraftId: randomUUID(),
        draft: {
          title: 'PRIVATE_IDENTITY_AUTHOR_DRAFT',
          summary: 'Synthetic private draft.',
          markdown: 'PRIVATE_IDENTITY_AUTHOR_DRAFT',
          categoryId: null,
          tagIds: [],
          coverMediaId: null,
        },
      },
      state.accounts.author,
    );
    await database.prisma.invitation.update({
      where: { id: state.invitations.expired.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await writeFile(stateFile, JSON.stringify(state), { mode: 0o600 });
    console.log(JSON.stringify(publicState()));
  } else {
    state = JSON.parse(await readFile(stateFile, 'utf8'));
    const account = state.accounts[label];
    if (['token', 'stale-id-token', 'expired-session'].includes(action)) {
      assert.ok(account, 'Unknown fixture account');
      const credential = await google(account);
      if (action === 'stale-id-token')
        credential.idToken = mutate(credential.idToken, {
          auth_time: Math.floor(Date.now() / 1000) - 301,
        });
      if (action === 'expired-session') {
        const cookie = await admin.createSessionCookie(credential.idToken, {
          expiresIn: 432000000,
        });
        console.log(
          JSON.stringify({
            sessionCookie: mutate(cookie, { exp: Math.floor(Date.now() / 1000) - 1 }),
          }),
        );
      } else console.log(JSON.stringify(credential));
    } else if (action === 'renew-invitation') {
      assert.ok(
        ['invitee', 'target', 'expired'].includes(label),
        'Unsupported renewable invitation',
      );
      const account = {
        subject: randomUUID(),
        email: `web-${label}-${randomUUID()}@example.test`,
        role: null,
      };
      const credential = await google(account);
      account.uid = credential.uid;
      state.accounts[label] = account;
      const issued = await backend('/v1/admin/invitations', 'POST', {
        email: account.email,
        role: 'AUTHOR',
      });
      const token = new URL(issued.inviteUrl).searchParams.get('token');
      assert.match(token, /^[A-Za-z0-9_-]{43}$/);
      state.invitations[label] = {
        id: issued.invitation.id,
        email: issued.invitation.email,
        token,
        key: randomUUID(),
      };
      if (label === 'expired')
        await database.prisma.invitation.update({
          where: { id: issued.invitation.id },
          data: { expiresAt: new Date(Date.now() - 1000) },
        });
      await writeFile(stateFile, JSON.stringify(state), { mode: 0o600 });
      console.log(JSON.stringify({ renewed: true }));
    } else if (action === 'private-post') {
      if (!state.accounts.other) {
        const other = {
          subject: randomUUID(),
          email: `web-other-${randomUUID()}@example.test`,
          role: 'AUTHOR',
        };
        const credential = await google(other);
        other.uid = credential.uid;
        const row = await database.prisma.member.create({
          data: {
            identityUid: other.uid,
            email: other.email,
            role: 'AUTHOR',
            displayName: 'Identity other author',
            handle: 'identity-other',
            bio: 'Synthetic identity integration profile.',
          },
        });
        other.memberId = row.id;
        state.accounts.other = other;
      }
      if (!state.privatePost)
        state.privatePost = await backend(
          '/v1/posts',
          'POST',
          {
            clientDraftId: randomUUID(),
            draft: {
              title: 'PRIVATE_IDENTITY_AUTHOR_DRAFT',
              summary: 'Synthetic private draft.',
              markdown: 'PRIVATE_IDENTITY_AUTHOR_DRAFT',
              categoryId: null,
              tagIds: [],
              coverMediaId: null,
            },
          },
          state.accounts.author,
        );
      await writeFile(stateFile, JSON.stringify(state), { mode: 0o600 });
      console.log(JSON.stringify({ id: state.privatePost.id }));
    } else if (action === 'account') {
      assert.ok(account, 'Unknown fixture account');
      console.log(JSON.stringify({ email: account.email, uid: account.uid, role: account.role }));
    } else if (action === 'invitation') {
      assert.ok(state.invitations[label], 'Unknown fixture invitation');
      console.log(JSON.stringify(state.invitations[label]));
    } else if (action === 'expire-invitation') {
      assert.ok(state.invitations[label], 'Unknown fixture invitation');
      await database.prisma.invitation.update({
        where: { id: state.invitations[label].id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      console.log(JSON.stringify({ expired: true }));
    } else if (action === 'disable' || action === 'enable') {
      assert.ok(account?.memberId, 'Unknown member fixture');
      await database.prisma.member.update({
        where: { id: account.memberId },
        data: { active: action === 'enable', version: { increment: 1 } },
      });
      console.log(JSON.stringify({ active: action === 'enable' }));
    } else if (action === 'revoke') {
      assert.ok(account, 'Unknown fixture account');
      await delay(1100);
      await admin.revokeRefreshTokens(account.uid);
      console.log(JSON.stringify({ revoked: true }));
    } else if (action === 'identity-capacity') {
      // Respect the real member quota between independent tests; never reset its buckets.
      const now = Date.now();
      const rows = await database.prisma.rateLimitBucket.findMany({
        where: {
          action: 'IDENTITY',
          memberId: {
            in: Object.values(state.accounts).flatMap((value) =>
              value.memberId ? [value.memberId] : [],
            ),
          },
          expiresAt: { gt: new Date(now) },
        },
        select: { memberId: true, count: true, expiresAt: true },
      });
      const members = new Map();
      for (const row of rows) {
        const used = members.get(row.memberId) ?? { count: 0, expiresAt: Infinity };
        used.count += row.count;
        used.expiresAt = Math.min(used.expiresAt, row.expiresAt.getTime());
        members.set(row.memberId, used);
      }
      const retryAfterMs = Math.max(
        0,
        ...[...members.values()]
          .filter((value) => value.count >= 4)
          .map((value) => value.expiresAt - now + 250),
      );
      console.log(JSON.stringify({ retryAfterMs }));
    } else if (action === 'state') {
      console.log(
        JSON.stringify({
          invitations: await database.prisma.invitation.findMany({
            select: { id: true, acceptedAt: true, revokedAt: true, expiresAt: true },
          }),
        }),
      );
    } else throw new Error('Unsupported identity fixture action');
  }
} finally {
  await database.onModuleDestroy();
  await deleteApp(fixtureApp);
}
