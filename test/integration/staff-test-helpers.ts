import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { test, expect, type Browser, type BrowserContext } from '@playwright/test';

export { test, expect };
export const stack = JSON.parse(readFileSync('.local/live-staff/context.json', 'utf8'));
export const namespace = `blogpost:${stack.name}:staff`;
export const control = <T = unknown>(action: string, input?: unknown): T =>
  JSON.parse(
    execFileSync(
      process.execPath,
      [
        'test/integration/staff-backend.mjs',
        action,
        ...(input === undefined ? [] : [typeof input === 'string' ? input : JSON.stringify(input)]),
      ],
      { encoding: 'utf8', windowsHide: true, timeout: 60_000, stdio: ['ignore', 'pipe', 'pipe'] },
    ),
  );
const sessions: BrowserContext[] = [];
test.beforeAll(async ({ browser }, info) => {
  control('prepare');
  writeFileSync(
    '.local/live-staff/browser.json',
    JSON.stringify({
      engine: browser.browserType().name(),
      version: browser.version(),
      channel: info.project.use.channel ?? 'default',
    }) + '\n',
  );
});
export async function waitForStaffCapacity() {
  const capacity = control<{ retryAfterMs: number }>('staff-capacity');
  expect(capacity.retryAfterMs).toBeGreaterThanOrEqual(0);
  expect(capacity.retryAfterMs).toBeLessThanOrEqual(61_000);
  if (capacity.retryAfterMs) {
    test.setTimeout(test.info().timeout + capacity.retryAfterMs);
    await delay(capacity.retryAfterMs);
  }
}
test.beforeEach(async () => {
  await waitForStaffCapacity();
});
test.afterEach(async () => {
  await Promise.all(sessions.splice(0).map((session) => session.close()));
});

export async function login(
  browser: Browser,
  label = 'author',
  overrides: { webOrigin?: string; namespace?: string } = {},
) {
  const origin = overrides.webOrigin ?? stack.webOrigin;
  const session = await browser.newContext({ baseURL: origin });
  session.setDefaultTimeout(15_000);
  session.setDefaultNavigationTimeout(30_000);
  sessions.push(session);
  const csrf = await session.request.get('/api/csrf');
  expect(csrf.status()).toBe(200);
  const { token } = await csrf.json();
  const credential = control<{ idToken: string; uid: string }>('token', label);
  let response;
  for (let attempt = 0; attempt < 4; attempt++) {
    response = await session.request.post('/api/session', {
      headers: { Origin: origin, 'X-CSRF-Token': token, 'content-type': 'application/json' },
      data: { idToken: credential.idToken },
    });
    if (response.status() !== 429 || attempt === 3) break;
    // The API also has a per-socket sign-in limit, independent of member buckets.
    const seconds = Number(response.headers()['retry-after']);
    expect(Number.isInteger(seconds) && seconds >= 1 && seconds <= 61).toBe(true);
    const pause = seconds * 1000 + 150;
    test.setTimeout(test.info().timeout + pause + 1000);
    await delay(pause);
  }
  if (!response) throw new Error('The isolated sign-in exchange did not run.');
  expect(response.status()).toBe(200);
  const { member } = await response.json();
  const page = await session.newPage();
  await page.goto('/');
  await page.evaluate(
    ({ namespace, memberId, uid }) => {
      localStorage.setItem(`${namespace}:identity`, JSON.stringify({ memberId, identityUid: uid }));
    },
    { namespace: overrides.namespace ?? namespace, memberId: member.id, uid: credential.uid },
  );
  return { session, page, uid: credential.uid, memberId: member.id };
}
export async function staffMutation(
  session: BrowserContext,
  path: string,
  options: {
    method?: string;
    content?: unknown;
    version?: number;
    key?: string;
    webOrigin?: string;
  } = {},
) {
  const captured = {
    ...options,
    content: structuredClone(options.content),
    key: options.key ?? randomUUID(),
  };
  for (let attempt = 0; attempt < 4; attempt++) {
    const csrf = await session.request.get('/api/csrf');
    expect(csrf.status()).toBe(200);
    const { token } = await csrf.json();
    const response = await session.request.fetch(`/api/editorial${path}`, {
      method: captured.method ?? 'POST',
      headers: {
        Origin: captured.webOrigin ?? stack.webOrigin,
        'X-CSRF-Token': token,
        'content-type': 'application/json',
        'Idempotency-Key': captured.key,
        ...(captured.version === undefined
          ? {}
          : { 'X-Expected-Version': String(captured.version) }),
      },
      ...(captured.content === undefined ? {} : { data: captured.content }),
    });
    if (response.status() === 429 && attempt < 3) {
      const seconds = Number(response.headers()['retry-after']);
      expect(Number.isInteger(seconds) && seconds >= 1 && seconds <= 61).toBe(true);
      const pause = seconds * 1000 + 150;
      test.setTimeout(test.info().timeout + pause + 1000);
      await delay(pause);
      continue;
    }
    return { response, body: await response.json() };
  }
  throw new Error('Synthetic setup did not obtain rate capacity.');
}
