// Read-only capacity observation inside this suite's disposable API container.
import { readFile } from 'node:fs/promises';
import { DatabaseService } from '../src/platform/database/database.service.js';
const database = new DatabaseService();
try {
  const identity = JSON.parse(await readFile('/tmp/web-identity-fixture.json', 'utf8'));
  const now = Date.now();
  const rows = await database.prisma.rateLimitBucket.findMany({
    where: {
      memberId: {
        in: Object.values(identity.accounts).flatMap((account) =>
          account.memberId ? [account.memberId] : [],
        ),
      },
      expiresAt: { gt: new Date(now) },
    },
    select: { memberId: true, action: true, count: true, expiresAt: true },
  });
  const groups = new Map();
  for (const row of rows) {
    const key = `${row.memberId}:${row.action}`;
    const values = groups.get(key) ?? [];
    values.push(row);
    groups.set(key, values);
  }
  let readyAt = now;
  // Reserve four identity operations, twenty writes and five uploads per member.
  // Individual setup batches also respect actual Retry-After without resetting buckets.
  const remaining = { IDENTITY: 1, WRITE: 10, UPLOAD: 5 };
  for (const group of groups.values()) {
    let count = group.reduce((sum, row) => sum + row.count, 0);
    for (const row of group.sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime())) {
      if (count <= remaining[row.action]) break;
      readyAt = Math.max(readyAt, row.expiresAt.getTime());
      count -= row.count;
    }
  }
  console.log(
    JSON.stringify({ retryAfterMs: Math.max(0, readyAt - now + (readyAt > now ? 150 : 0)) }),
  );
} finally {
  await database.onModuleDestroy();
}
