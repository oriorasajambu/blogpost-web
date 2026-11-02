import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import {
  test,
  expect,
  type Browser,
  type BrowserContext,
  type Page,
  type Route,
} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { LocalDraft } from '../../src/features/editor/draft-types';
import type { WorkspacePost } from '../../src/features/editor/editor-contract';
import { captureWebProvenance, matchingWebProvenance } from './web-source-provenance.mjs';

// Auth is the real web-session exchange against the isolated Authentication
// Emulator and PostgreSQL backend. The browser receives no fixture bearer token.
const stack = JSON.parse(readFileSync('.local/live-editor/context.json', 'utf8'));
const namespace = `blogpost:${stack.name}:staff`;
const databaseName = `${namespace}:editor`;
const provenance = captureWebProvenance();
const control = <T = unknown>(action: string, input?: unknown): T =>
  JSON.parse(
    execFileSync(
      process.execPath,
      [
        'test/integration/editor-backend.mjs',
        action,
        ...(input === undefined ? [] : [typeof input === 'string' ? input : JSON.stringify(input)]),
      ],
      { encoding: 'utf8', windowsHide: true, timeout: 60_000 },
    ),
  );
const sessions: BrowserContext[] = [];
let taxonomy: { category: { id: string }; tags: { id: string; name: string }[] };
let registered = 0;
const results: { title: string; status: string; durationMs: number }[] = [];
let browserEvidence: { engine: string; version: string; channel: string };
const editorTest: typeof test = ((...args: Parameters<typeof test>) => {
  registered += 1;
  return test(...args);
}) as typeof test;

test.beforeAll(async ({ browser }, info) => {
  taxonomy = control('prepare');
  browserEvidence = {
    engine: browser.browserType().name(),
    version: browser.version(),
    channel: info.project.use.channel ?? 'default',
  };
});
test.beforeEach(async ({}, info) => {
  const capacity = control<{ retryAfterMs: number }>('identity-capacity');
  expect(capacity.retryAfterMs).toBeGreaterThanOrEqual(0);
  expect(capacity.retryAfterMs).toBeLessThanOrEqual(61_000);
  if (capacity.retryAfterMs) {
    test.setTimeout(info.timeout + capacity.retryAfterMs);
    await delay(capacity.retryAfterMs);
  }
});
test.afterEach(async ({}, info) => {
  results.push({ title: info.title, status: info.status ?? 'unknown', durationMs: info.duration });
  await Promise.all(sessions.splice(0).map((session) => session.close()));
});
test.afterAll(() => {
  const after = captureWebProvenance();
  const unchanged = matchingWebProvenance(provenance, after);
  const passed =
    unchanged && results.length === registered && results.every((item) => item.status === 'passed');
  const report = {
    schemaVersion: 1,
    status: passed ? 'PASSED' : 'INCOMPLETE',
    testedAt: new Date().toISOString(),
    scope:
      'Durable editor with actual browser IndexedDB, real local API, PostgreSQL, media normalizer and emulator-backed web sessions',
    browser: browserEvidence,
    webProvenance: {
      ...provenance,
      verifiedAt: after.capturedAt,
      sourceAndBuildUnchanged: unchanged,
    },
    backendSourceSha: stack.sourceSha,
    backendImage: stack.image,
    authImage: stack.authImage,
    runtimeInputDigest: stack.runtimeInputDigest,
    sourceInputDigest: stack.sourceInputDigest,
    contractStatus: stack.contractStatus,
    providerSmoke: 'Not a configured real Google provider smoke',
    tests: results,
  };
  mkdirSync('.local/live-editor', { recursive: true });
  writeFileSync('.local/live-editor/latest-run.json', JSON.stringify(report, null, 2) + '\n');
  if (passed) {
    mkdirSync('docs/durable-editor', { recursive: true });
    writeFileSync(
      'docs/durable-editor/local-validation.json',
      JSON.stringify(report, null, 2) + '\n',
    );
  }
  if (!unchanged) throw new Error('Production source or build changed during the editor suite.');
});

async function login(browser: Browser, label = 'author') {
  const session = await browser.newContext({ baseURL: stack.webOrigin });
  sessions.push(session);
  const csrfResponse = await session.request.get('/api/csrf');
  expect(csrfResponse.status()).toBe(200);
  const { token } = await csrfResponse.json();
  const credential = control<{ idToken: string; uid: string }>('token', label);
  const response = await session.request.post('/api/session', {
    headers: { Origin: stack.webOrigin, 'X-CSRF-Token': token, 'content-type': 'application/json' },
    data: { idToken: credential.idToken },
  });
  expect(response.status()).toBe(200);
  const { member } = await response.json();
  const page = await session.newPage();
  await page.goto('/');
  // The Google SDK writes this public identity pointer after exchange. It is
  // deliberately separate from authentication; every endpoint still authorizes.
  await page.evaluate(
    ({ namespace, memberId, uid }) => {
      localStorage.setItem(`${namespace}:identity`, JSON.stringify({ memberId, identityUid: uid }));
    },
    { namespace, memberId: member.id, uid: credential.uid },
  );
  return { session, page, uid: credential.uid, memberId: member.id };
}
async function openNew(browser: Browser) {
  const session = await login(browser);
  await session.page.goto('/studio/posts/new');
  await expect(
    session.page.getByRole('heading', { name: 'Write a draft', exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => new URL(session.page.url()).searchParams.get('local'))
    .toMatch(/^[a-f0-9-]{36}$/);
  return session;
}
async function records(page: Page): Promise<LocalDraft[]> {
  return page.evaluate(async (databaseName) => {
    const request = indexedDB.open(databaseName);
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const tx = database.transaction('drafts', 'readonly');
      const read = tx.objectStore('drafts').getAll();
      return await new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve(read.result);
        tx.onabort = () => reject(tx.error);
      });
    } finally {
      database.close();
    }
  }, databaseName) as Promise<LocalDraft[]>;
}
async function current(page: Page) {
  const url = new URL(page.url());
  const id = url.searchParams.get('local');
  const postId = url.pathname.split('/').at(-1);
  const drafts = await records(page);
  const draft = drafts.find((item) => (id ? item.clientDraftId === id : item.postId === postId));
  if (!draft) throw new Error('Current editor record was not durably committed');
  return draft;
}
async function sourceBlobs(page: Page) {
  const draft = await current(page);
  return page.evaluate(
    async ({ databaseName, uid, id }) => {
      const request = indexedDB.open(databaseName);
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      try {
        const tx = db.transaction('drafts', 'readonly');
        const read = tx.objectStore('drafts').get([uid, id]);
        return await new Promise<{ id: string; size: number; type: string; nativeBlob: boolean }[]>(
          (resolve, reject) => {
            tx.oncomplete = () =>
              resolve(
                (read.result as LocalDraft).images.map((image) => ({
                  id: image.localId,
                  size: image.blob.size,
                  type: image.blob.type,
                  nativeBlob: image.blob instanceof Blob,
                })),
              );
            tx.onabort = () => reject(tx.error);
          },
        );
      } finally {
        db.close();
      }
    },
    { databaseName, uid: draft.uid, id: draft.clientDraftId },
  );
}
async function persisted(page: Page, markdown: string) {
  await expect.poll(async () => (await current(page)).content.markdown).toBe(markdown);
  await expect(page.getByText(/^Saved on this device at /)).toBeVisible();
  return current(page);
}
async function write(page: Page, markdown = 'Local durable text.') {
  await page.getByLabel('Title', { exact: true }).fill(`Editor ${randomUUID()}`);
  await page.getByLabel('Summary', { exact: true }).fill('A synthetic integration draft.');
  await page.getByLabel('Category', { exact: true }).selectOption(taxonomy.category.id);
  await page.getByLabel('Markdown', { exact: true }).fill(markdown);
  return persisted(page, markdown);
}
async function synced(page: Page) {
  await expect
    .poll(
      async () => {
        const draft = await current(page);
        return (
          draft.postId !== null &&
          draft.pending === null &&
          draft.syncedGeneration === draft.generation
        );
      },
      { timeout: 45_000 },
    )
    .toBe(true);
  await expect(page.getByText(/Last synced to server at /)).toBeVisible();
  return current(page);
}
async function openExisting(browser: Browser, post: WorkspacePost) {
  const session = await login(browser);
  await session.page.goto(`/studio/posts/${post.id}`);
  await expect(session.page.getByLabel('Markdown', { exact: true })).toBeVisible();
  await expect.poll(async () => (await current(session.page)).postId).toBe(post.id);
  return session;
}
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
const mutationRoute = (route: Route) => ['POST', 'PUT'].includes(route.request().method());
const postState = (postId: string) =>
  control<{
    post: WorkspacePost;
    revisions: number;
    reviews: number;
    media: { id: string; unattachedExpiresAt: string | null }[];
  }>('post-state', { postId });

editorTest(
  'local transaction acknowledgment, reload, offline editing and explicit first sync',
  async ({ browser }) => {
    const { page, session, uid, memberId } = await openNew(browser);
    await expect(page.getByText(/browser profile/i).first()).toBeVisible();
    const draft = await write(page, 'Durable before reload.');
    expect(draft.uid).toBe(uid);
    expect(draft.memberId).toBe(memberId);
    expect(draft.postId).toBeNull();
    expect(
      control<{ count: number }>('post-count', { clientDraftId: draft.clientDraftId }).count,
    ).toBe(0);
    await page.reload();
    await expect(page.getByLabel('Markdown', { exact: true })).toHaveValue(
      'Durable before reload.',
    );
    await session.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(
      page.getByRole('heading', { name: 'We couldn’t check your staff session.', exact: true }),
    ).toBeVisible();
    await page.getByLabel('Markdown', { exact: true }).fill('Durable while offline.');
    await persisted(page, 'Durable while offline.');
    await expect(page.getByText(/^Unsynced changes/)).toBeVisible();
    await session.setOffline(false);
    await page.getByRole('button', { name: 'Sync', exact: true }).click();
    const saved = await synced(page);
    expect(saved.clientDraftId).toBe(draft.clientDraftId);
    expect(postState(saved.postId!).post.workingRevision?.content.markdown).toBe(
      'Durable while offline.',
    );
    expect(
      control<{ count: number }>('post-count', { clientDraftId: saved.clientDraftId }).count,
    ).toBe(1);
    const anonymous = await browser.newContext({ baseURL: stack.webOrigin });
    sessions.push(anonymous);
    expect((await anonymous.request.get(`/api/editorial/posts/${saved.postId}`)).status()).toBe(
      401,
    );
    expect(await (await anonymous.request.get('/')).text()).not.toContain(saved.content.title);
  },
);

editorTest(
  'typing during first sync stays dirty while the captured generation commits',
  async ({ browser }) => {
    const { page } = await openNew(browser);
    const before = await write(page, 'Captured snapshot.');
    const intercepted = deferred(),
      release = deferred();
    await page.route('**/api/editorial/posts', async (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      intercepted.resolve();
      await release.promise;
      await route.continue();
    });
    await page.getByRole('button', { name: 'Sync', exact: true }).click();
    await intercepted.promise;
    await page.getByLabel('Markdown', { exact: true }).fill('Typed after sync started.');
    await persisted(page, 'Typed after sync started.');
    release.resolve();
    await expect.poll(async () => (await current(page)).postId, { timeout: 30_000 }).not.toBeNull();
    await expect.poll(async () => (await current(page)).pending).toBeNull();
    const after = await current(page);
    expect(after.generation).toBeGreaterThan(before.generation);
    expect(after.syncedGeneration).toBe(before.generation);
    expect(after.content.markdown).toBe('Typed after sync started.');
    expect(postState(after.postId!).post.workingRevision?.content.markdown).toBe(
      'Captured snapshot.',
    );
    await expect(page.getByText(/^Unsynced changes/)).toBeVisible();
  },
);

async function lostCreate(browser: Browser) {
  const account = await openNew(browser);
  await write(account.page, 'Create committed with its response interrupted.');
  let key = '',
    wire = '';
  await account.page.route('**/api/editorial/posts', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    key = route.request().headers()['idempotency-key'];
    wire = route.request().postData()!;
    const response = await route.fetch();
    expect(response.status()).toBe(201);
    await route.abort('connectionreset');
  });
  await account.page.getByRole('button', { name: 'Sync', exact: true }).click();
  await expect.poll(() => key).toMatch(/^[a-f0-9-]{36}$/);
  await expect(account.page.getByRole('button', { name: 'Sync', exact: true })).toBeEnabled();
  const draft = await current(account.page);
  expect(draft.pending?.kind).toBe('sync');
  expect(draft.pending?.kind === 'sync' && draft.pending.create?.key).toBe(key);
  expect(
    control<{ count: number }>('post-count', { clientDraftId: draft.clientDraftId }).count,
  ).toBe(1);
  await account.page.unroute('**/api/editorial/posts');
  return { ...account, draft, key, wire };
}
editorTest('controlled editor exit flushes typing before navigating away', async ({ browser }) => {
  const { page } = await openNew(browser);
  const before = await write(page, 'Before controlled exit.');
  const path = new URL(page.url()).pathname + new URL(page.url()).search;
  await page
    .getByLabel('Markdown', { exact: true })
    .fill('Typing immediately before controlled exit.');
  await page.getByRole('link', { name: 'All your drafts', exact: true }).click();
  await expect(page).toHaveURL(stack.webOrigin + '/studio/posts');
  const persisted = (await records(page)).find(
    (item) => item.clientDraftId === before.clientDraftId,
  )!;
  expect(persisted.content.markdown).toBe('Typing immediately before controlled exit.');
  await page.goto(path);
  await expect(page.getByLabel('Markdown', { exact: true })).toHaveValue(
    'Typing immediately before controlled exit.',
  );
});

editorTest(
  'controlled client history exit flushes typing before returning to the workspace',
  async ({ browser }) => {
    const { page } = await login(browser);
    await page.goto('/studio/posts');
    await page.getByRole('link', { name: 'Write a draft', exact: true }).click();
    await expect
      .poll(() => new URL(page.url()).searchParams.get('local'))
      .toMatch(/^[a-f0-9-]{36}$/);
    const before = await write(page, 'Before client history exit.');
    const path = new URL(page.url()).pathname + new URL(page.url()).search;
    await page
      .getByLabel('Markdown', { exact: true })
      .fill('Typing immediately before client history exit.');
    await page.goBack();
    await expect(page).toHaveURL(stack.webOrigin + '/studio/posts');
    // Back changes the URL before the editor's flush-triggered document load.
    // Inspect IDB only after the actual destination is rendered.
    await expect(
      page.getByRole('heading', { name: 'Your staff workspace', exact: true }),
    ).toBeVisible();
    const saved = (await records(page)).find(
      (item) => item.clientDraftId === before.clientDraftId,
    )!;
    expect(saved.content.markdown).toBe('Typing immediately before client history exit.');
    await page.goto(path);
    await expect(page.getByLabel('Markdown', { exact: true })).toHaveValue(
      'Typing immediately before client history exit.',
    );
  },
);

editorTest(
  'reload refreshes a clean device snapshot while retaining a dirty snapshot and its base',
  async ({ browser }) => {
    const post = control<WorkspacePost>('create-post', {
      content: { markdown: 'Clean server original.' },
    });
    const { page } = await openExisting(browser, post);
    const advanced = control<WorkspacePost>('advance-post', {
      postId: post.id,
      content: { markdown: 'Clean snapshot updated on server.' },
    });
    await page.reload();
    await expect(page.getByLabel('Markdown', { exact: true })).toHaveValue(
      'Clean snapshot updated on server.',
    );
    let draft = await current(page);
    expect(draft.base?.version).toBe(advanced.version);
    expect(draft.generation).toBe(draft.syncedGeneration);
    await page.getByLabel('Markdown', { exact: true }).fill('Keep these dirty local changes.');
    await persisted(page, 'Keep these dirty local changes.');
    control('advance-post', {
      postId: post.id,
      content: { markdown: 'Another independent server change.' },
    });
    await page.reload();
    await expect(page.getByLabel('Markdown', { exact: true })).toHaveValue(
      'Keep these dirty local changes.',
    );
    draft = await current(page);
    expect(draft.base?.version).toBe(advanced.version);
    expect(draft.base?.workingRevision?.content.markdown).toBe('Clean snapshot updated on server.');
    expect(draft.generation).toBeGreaterThan(draft.syncedGeneration);
  },
);

for (const navigationApi of [true, false])
  editorTest(
    `failed device saving keeps the editor available when browser Back is requested (${navigationApi ? 'Navigation API' : 'history fallback'})`,
    async ({ browser }) => {
      const { page } = await login(browser);
      if (!navigationApi)
        await page.addInitScript(() =>
          Object.defineProperty(window, 'navigation', { value: undefined, configurable: true }),
        );
      await page.goto('/studio/posts');
      await page.getByRole('link', { name: 'Write a draft', exact: true }).click();
      await expect
        .poll(() => new URL(page.url()).searchParams.get('local'))
        .toMatch(/^[a-f0-9-]{36}$/);
      const before = await write(page, 'Committed before failed history exit.');
      const editorUrl = page.url();
      await page.evaluate(() => {
        IDBObjectStore.prototype.put = function () {
          throw new DOMException('Synthetic full storage', 'QuotaExceededError');
        };
      });
      await page
        .getByLabel('Markdown', { exact: true })
        .fill('Uncommitted text retained after Back fails.');
      await expect(
        page
          .getByRole('alert')
          .filter({ hasText: /storage|device|save|quota/i })
          .first(),
      ).toBeVisible();
      await page.goBack();
      await expect(page).toHaveURL(editorUrl);
      await expect(page.getByLabel('Markdown', { exact: true })).toHaveValue(
        'Uncommitted text retained after Back fails.',
      );
      expect((await current(page)).content.markdown).toBe(before.content.markdown);
      const download = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Export Markdown', exact: true }).first().click();
      expect(readFileSync((await (await download).path())!, 'utf8')).toContain(
        'Uncommitted text retained after Back fails.',
      );
    },
  );

editorTest(
  'lost create response survives reload and retries the exact persisted input and key',
  async ({ browser }) => {
    const { page, key, wire, draft } = await lostCreate(browser);
    await page.reload();
    let retried = false;
    await page.route('**/api/editorial/posts', async (route) => {
      if (route.request().method() === 'POST') {
        retried = true;
        expect(route.request().headers()['idempotency-key']).toBe(key);
        expect(route.request().postData()).toBe(wire);
      }
      await route.continue();
    });
    await page.getByRole('button', { name: 'Sync', exact: true }).click();
    const recovered = await synced(page);
    expect(retried).toBe(true);
    expect(recovered.clientDraftId).toBe(draft.clientDraftId);
    expect(
      control<{ count: number }>('post-count', { clientDraftId: draft.clientDraftId }).count,
    ).toBe(1);
    expect(postState(recovered.postId!).revisions).toBe(1);
  },
);

editorTest(
  'a clean server refresh prevents a stale tab from writing over the adopted base',
  async ({ browser }) => {
    const post = control<WorkspacePost>('create-post', {
      content: { markdown: 'Original two-tab clean base.' },
    });
    const { page, session } = await openExisting(browser, post);
    const before = await current(page);
    const second = await session.newPage();
    await second.goto(page.url());
    await expect(second.getByLabel('Markdown', { exact: true })).toHaveValue(
      'Original two-tab clean base.',
    );
    const advanced = control<WorkspacePost>('advance-post', {
      postId: post.id,
      content: { markdown: 'Fresh authoritative server content.' },
    });
    await page.getByRole('button', { name: 'Sync', exact: true }).click();
    await expect(page.getByLabel('Markdown', { exact: true })).toHaveValue(
      'Fresh authoritative server content.',
    );
    const refreshed = await current(page);
    expect(refreshed.generation).toBeGreaterThan(before.generation);
    expect(refreshed.generation).toBe(refreshed.syncedGeneration);
    await second.getByLabel('Markdown', { exact: true }).fill('Stale tab text kept for export.');
    await expect(
      second
        .getByRole('alert')
        .filter({ hasText: /another tab|local.*chang|newer/i })
        .first(),
    ).toBeVisible();
    const saved = await current(page);
    expect(saved.content.markdown).toBe('Fresh authoritative server content.');
    expect(saved.base?.version).toBe(advanced.version);
    expect(postState(post.id).post.workingRevision?.content.markdown).toBe(
      'Fresh authoritative server content.',
    );
    const download = second.waitForEvent('download');
    await second.getByRole('button', { name: 'Export Markdown', exact: true }).first().click();
    expect(readFileSync((await (await download).path())!, 'utf8')).toContain(
      'Stale tab text kept for export.',
    );
  },
);

editorTest(
  'typing after a clean refresh request succeeds but before its transaction commits is preserved for review',
  async ({ browser }) => {
    const post = control<WorkspacePost>('create-post', {
      content: { markdown: 'Original atomic refresh base.' },
    });
    const { page } = await openExisting(browser, post);
    const advanced = control<WorkspacePost>('advance-post', {
      postId: post.id,
      content: { markdown: 'Current server atomic refresh source.' },
    });
    let mutations = 0;
    page.on('request', (request) => {
      if (request.method() === 'PUT' && request.url().endsWith('/draft')) mutations++;
    });
    const volatileText = 'Typing at the native transaction completion boundary.';
    await page.evaluate(
      ({ version, text }) => {
        const original = IDBObjectStore.prototype.put;
        let armed = true;
        IDBObjectStore.prototype.put = function (value: unknown, key?: IDBValidKey) {
          const request = original.call(this, value, key);
          const candidate = value as Partial<LocalDraft>;
          if (
            armed &&
            candidate.base?.version === version &&
            candidate.pending === null &&
            candidate.generation === candidate.syncedGeneration
          ) {
            armed = false;
            request.addEventListener(
              'success',
              () => {
                const field = document.querySelector<HTMLTextAreaElement>('.editor-source');
                if (!field)
                  throw new Error('The source editor was not mounted at the transaction boundary');
                const setter = Object.getOwnPropertyDescriptor(
                  HTMLTextAreaElement.prototype,
                  'value',
                )!.set!;
                setter.call(field, text);
                field.dispatchEvent(new Event('input', { bubbles: true }));
              },
              { once: true },
            );
          }
          return request;
        };
      },
      { version: advanced.version, text: volatileText },
    );
    await page.getByRole('button', { name: 'Sync', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Changes need your review' });
    await expect(dialog).toBeVisible();
    await expect
      .poll(async () => (await current(page)).conflict?.local.markdown)
      .toBe(volatileText);
    const preserved = await current(page);
    expect(preserved.base?.version).toBe(post.version);
    expect(preserved.conflict?.base?.version).toBe(post.version);
    expect(preserved.conflict?.server?.version).toBe(advanced.version);
    expect(preserved.content.markdown).toBe(volatileText);
    expect(preserved.generation).toBeGreaterThan(preserved.syncedGeneration);
    expect(mutations).toBe(0);
    expect(postState(post.id).post.workingRevision?.content.markdown).toBe(
      'Current server atomic refresh source.',
    );
  },
);

editorTest(
  'a server change during manual combining preserves the proposal and requires review again',
  async ({ browser }) => {
    const post = control<WorkspacePost>('create-post', {
      content: { markdown: 'Original merge base.' },
    });
    const { page } = await openExisting(browser, post);
    await page.getByLabel('Markdown', { exact: true }).fill('Local merge source.');
    await persisted(page, 'Local merge source.');
    control('advance-post', {
      postId: post.id,
      content: { markdown: 'First conflicting server source.' },
    });
    await page.getByRole('button', { name: 'Sync', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Changes need your review' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Combine changes', exact: true }).click();
    await dialog
      .getByLabel('Combined Markdown', { exact: true })
      .fill('Proposed manual combined source.');
    const newest = control<WorkspacePost>('advance-post', {
      postId: post.id,
      content: { markdown: 'Second conflicting server source.' },
    });
    await dialog.getByRole('button', { name: 'Apply combined changes', exact: true }).click();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('region', { name: 'Current server' })).toContainText(
      'Second conflicting server source.',
    );
    await expect(dialog.getByLabel('Combined Markdown', { exact: true })).toHaveValue(
      'Proposed manual combined source.',
    );
    const pendingReview = await current(page);
    expect(pendingReview.conflict?.server?.version).toBe(newest.version);
    expect(pendingReview.content.markdown).toBe('Proposed manual combined source.');
    expect(pendingReview.base?.version).toBe(post.version);
    expect(postState(post.id).post.version).toBe(newest.version);
    await dialog.getByRole('button', { name: 'Apply combined changes', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await page.getByRole('button', { name: 'Sync', exact: true }).click();
    await synced(page);
    expect(postState(post.id).post.workingRevision?.content.markdown).toBe(
      'Proposed manual combined source.',
    );
  },
);

editorTest(
  'web Sync of a published post keeps its working changes private',
  async ({ browser }) => {
    const marker = `PUBLISHED_EDITOR_${randomUUID()}`;
    const privateMarker = `PRIVATE_EDITOR_${randomUUID()}`;
    const post = control<WorkspacePost>('create-post', {
      published: true,
      content: { title: marker, markdown: marker },
    });
    expect(post.slug).not.toBeNull();
    const { page } = await openExisting(browser, post);
    await page.getByLabel('Markdown', { exact: true }).fill(privateMarker);
    await persisted(page, privateMarker);
    await page.getByRole('button', { name: 'Sync', exact: true }).click();
    const saved = await synced(page);
    expect(saved.base?.publishedRevisionId).toBe(post.publishedRevisionId);
    expect(saved.base?.workingRevisionId).not.toBe(post.publishedRevisionId);
    await expect(
      page.getByText('Published with unpublished changes', { exact: true }),
    ).toBeVisible();
    const anonymous = await browser.newContext({ baseURL: stack.webOrigin });
    sessions.push(anonymous);
    const article = await anonymous.request.get(`/posts/${post.slug}`);
    expect(article.status()).toBe(200);
    const html = await article.text();
    expect(html).toContain(marker);
    expect(html).not.toContain(privateMarker);
  },
);

editorTest(
  'replayed create refetches a newer current server revision before adoption',
  async ({ browser }) => {
    const { page, draft } = await lostCreate(browser);
    const lookup = await page.request.get(
      `/api/editorial/posts/by-client-draft-id/${draft.clientDraftId}`,
    );
    expect(lookup.status()).toBe(200);
    const initial = (await lookup.json()).data as WorkspacePost;
    const advanced = control<WorkspacePost>('advance-post', {
      postId: initial.id,
      content: { markdown: 'A newer server edit after the lost receipt.' },
    });
    let mutations = 0;
    page.on('request', (request) => {
      if (request.method() === 'PUT' && request.url().endsWith('/draft')) mutations++;
    });
    await page.getByRole('button', { name: 'Sync', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Changes need your review' });
    await expect(dialog).toBeVisible();
    const result = await current(page);
    expect(result.conflict?.reason).toBe('replay-diverged');
    expect(result.conflict?.server?.version).toBe(advanced.version);
    expect(result.content.markdown).toBe(draft.content.markdown);
    expect(postState(initial.id).post.version).toBe(advanced.version);
    expect(mutations).toBe(0);
    expect(
      control<{ count: number }>('post-count', { clientDraftId: draft.clientDraftId }).count,
    ).toBe(1);
  },
);

editorTest(
  'uncertain create after the replay window uses authorized lookup without duplication',
  async ({ browser }) => {
    const { page, key, uid, draft } = await lostCreate(browser);
    control('expire-replay', { key });
    await page.evaluate(
      async ({ databaseName, uid, id }) => {
        const open = indexedDB.open(databaseName);
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          open.onsuccess = () => resolve(open.result);
          open.onerror = () => reject(open.error);
        });
        const tx = db.transaction('drafts', 'readwrite');
        const store = tx.objectStore('drafts');
        const read = store.get([uid, id]);
        read.onsuccess = () => {
          const value = read.result as LocalDraft;
          if (value.pending?.kind !== 'sync' || !value.pending.create)
            throw new Error('Missing pending create');
          const old = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
          value.pending.createdAt = old;
          value.pending.create.startedAt = old;
          value.pending.create.expiresAt = new Date(Date.now() - 1000).toISOString();
          value.storageVersion += 1;
          store.put(value);
        };
        await new Promise<void>((resolve, reject) => {
          tx.oncomplete = () => resolve();
          tx.onabort = () => reject(tx.error);
        });
        db.close();
      },
      { databaseName, uid, id: draft.clientDraftId },
    );
    await page.reload();
    let creates = 0,
      lookups = 0;
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.pathname === '/api/editorial/posts' && request.method() === 'POST') creates++;
      if (url.pathname.includes('/posts/by-client-draft-id/')) lookups++;
    });
    await page.getByRole('button', { name: 'Sync', exact: true }).click();
    await synced(page);
    expect(lookups).toBeGreaterThan(0);
    expect(creates).toBe(0);
    expect(
      control<{ count: number }>('post-count', { clientDraftId: draft.clientDraftId }).count,
    ).toBe(1);
  },
);

for (const choice of [
  'Use server version',
  'Combine changes',
  'Save local as a new draft',
] as const) {
  editorTest(`412 preserves base/server/local snapshots: ${choice}`, async ({ browser }) => {
    const initial = control<WorkspacePost>('create-post', {
      content: { markdown: 'Original conflict base.' },
    });
    const { page } = await openExisting(browser, initial);
    await page.getByLabel('Markdown', { exact: true }).fill('Local conflict text.');
    await persisted(page, 'Local conflict text.');
    const advanced = control<WorkspacePost>('advance-post', {
      postId: initial.id,
      content: { markdown: 'Current server conflict text.' },
    });
    let saves = 0;
    page.on('request', (request) => {
      if (request.method() === 'PUT' && request.url().endsWith('/draft')) saves++;
    });
    await page.getByRole('button', { name: 'Sync', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Changes need your review' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('region', { name: 'Original base' })).toContainText(
      'Original conflict base.',
    );
    await expect(dialog.getByRole('region', { name: 'Current server' })).toContainText(
      'Current server conflict text.',
    );
    await expect(dialog.getByRole('region', { name: 'Your local version' })).toContainText(
      'Local conflict text.',
    );
    const conflict = (await current(page)).conflict;
    expect(conflict?.base?.version).toBe(initial.version);
    expect(conflict?.server?.version).toBe(advanced.version);
    expect(conflict?.local.markdown).toBe('Local conflict text.');
    expect(saves).toBe(1); // No hidden retry against a newer server version.
    await dialog.getByRole('button', { name: choice, exact: true }).click();
    if (choice === 'Combine changes') {
      await dialog
        .getByLabel('Combined Markdown', { exact: true })
        .fill('Manually combined local and server.');
      await dialog.getByRole('button', { name: 'Apply combined changes', exact: true }).click();
    }
    await expect(dialog).not.toBeVisible();
    if (choice === 'Use server version') {
      await expect(page.getByLabel('Markdown', { exact: true })).toHaveValue(
        'Current server conflict text.',
      );
      expect((await current(page)).base?.version).toBe(advanced.version);
      expect(saves).toBe(1);
    } else if (choice === 'Combine changes') {
      await persisted(page, 'Manually combined local and server.');
      await page.getByRole('button', { name: 'Sync', exact: true }).click();
      await synced(page);
      expect(postState(initial.id).post.workingRevision?.content.markdown).toBe(
        'Manually combined local and server.',
      );
      expect(saves).toBe(2);
    } else {
      const separate = await current(page);
      expect(separate.clientDraftId).not.toBe(initial.clientDraftId);
      expect(separate.postId).toBeNull();
      expect(separate.content.markdown).toBe('Local conflict text.');
      expect(postState(initial.id).post.workingRevision?.content.markdown).toBe(
        'Current server conflict text.',
      );
      await page.getByRole('button', { name: 'Sync', exact: true }).click();
      expect((await synced(page)).postId).not.toBe(initial.id);
    }
  });
}

editorTest(
  'two tabs warn and stale browser writes cannot replace a newer local generation',
  async ({ browser }) => {
    const { page, session } = await openNew(browser);
    const base = await write(page, 'Two-tab original.');
    const second = await session.newPage();
    await second.goto(page.url());
    await expect(second.getByLabel('Markdown', { exact: true })).toHaveValue('Two-tab original.');
    await expect(page.getByText(/another tab/i).first()).toBeVisible();
    await expect(second.getByText(/another tab/i).first()).toBeVisible();
    await page.getByLabel('Markdown', { exact: true }).fill('First tab commits newer work.');
    await persisted(page, 'First tab commits newer work.');
    await second.getByLabel('Markdown', { exact: true }).fill('Second tab stale work for export.');
    await expect(
      second
        .getByRole('alert')
        .filter({ hasText: /another tab|local.*chang|newer/i })
        .first(),
    ).toBeVisible();
    const committed = (await records(page)).find(
      (item) => item.clientDraftId === base.clientDraftId,
    )!;
    expect(committed.content.markdown).toBe('First tab commits newer work.');
    const download = second.waitForEvent('download');
    await second.getByRole('button', { name: 'Export Markdown', exact: true }).first().click();
    const path = await (await download).path();
    expect(readFileSync(path!, 'utf8')).toContain('Second tab stale work for export.');
  },
);

editorTest(
  'quota failure is visible, never acknowledged as saved, and volatile work exports',
  async ({ browser }) => {
    const { page } = await openNew(browser);
    await write(page, 'Committed before quota failure.');
    await page.evaluate(() => {
      IDBObjectStore.prototype.put = function () {
        throw new DOMException('Synthetic full storage', 'QuotaExceededError');
      };
      IDBObjectStore.prototype.add = function () {
        throw new DOMException('Synthetic full storage', 'QuotaExceededError');
      };
    });
    await page.getByLabel('Markdown', { exact: true }).fill('Volatile text after quota failure.');
    await expect(
      page
        .getByRole('alert')
        .filter({ hasText: /storage|device|save|quota/i })
        .first(),
    ).toBeVisible();
    expect((await current(page)).content.markdown).toBe('Committed before quota failure.');
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export Markdown', exact: true }).first().click();
    expect(readFileSync((await (await download).path())!, 'utf8')).toContain(
      'Volatile text after quota failure.',
    );
    let mutations = 0;
    page.on('request', (request) => {
      if (request.url().includes('/api/editorial/') && ['PUT', 'POST'].includes(request.method()))
        mutations++;
    });
    await page.getByRole('button', { name: 'Sync', exact: true }).click();
    await expect(
      page
        .getByRole('alert')
        .filter({ hasText: /storage|device|save|quota/i })
        .first(),
    ).toBeVisible();
    expect(mutations).toBe(0);
  },
);

for (const failure of ['unavailable', 'newer-schema'] as const) {
  editorTest(`storage ${failure} retains a usable Markdown export path`, async ({ browser }) => {
    const { page } = await login(browser);
    if (failure === 'unavailable') {
      await page.addInitScript(() =>
        Object.defineProperty(window, 'indexedDB', {
          get() {
            throw new DOMException('Synthetic unavailable storage', 'SecurityError');
          },
        }),
      );
    } else {
      await page.evaluate(async (databaseName) => {
        const request = indexedDB.open(databaseName, 99);
        await new Promise<void>((resolve, reject) => {
          request.onsuccess = () => {
            request.result.close();
            resolve();
          };
          request.onerror = () => reject(request.error);
        });
      }, databaseName);
    }
    await page.goto('/studio/posts/new');
    await expect(
      page
        .getByRole('alert')
        .filter({ hasText: /storage|device|database|save/i })
        .first(),
    ).toBeVisible();
    await page
      .getByLabel('Markdown', { exact: true })
      .fill('Recovery despite unavailable durable storage.');
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export Markdown', exact: true }).first().click();
    expect(readFileSync((await (await download).path())!, 'utf8')).toContain(
      'Recovery despite unavailable durable storage.',
    );
    await expect(page.getByText(/^Saved on this device at /)).not.toBeVisible();
  });
}

editorTest(
  'an IndexedDB request succeeding before transaction abort never acknowledges a device save',
  async ({ browser }) => {
    const { page } = await openNew(browser);
    await write(page, 'The last committed transaction.');
    await page.evaluate(() => {
      const original = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function (...args) {
        const request = original.apply(this, args);
        request.addEventListener('success', () => this.transaction.abort(), { once: true });
        return request;
      };
    });
    await page
      .getByLabel('Markdown', { exact: true })
      .fill('Request success is not transaction success.');
    await expect(
      page
        .getByRole('alert')
        .filter({ hasText: /storage|device|save/i })
        .first(),
    ).toBeVisible();
    expect((await current(page)).content.markdown).toBe('The last committed transaction.');
    await expect(page.getByText('Changes waiting for device save', { exact: true })).toBeVisible();
  },
);

editorTest(
  'image Blob remains through interrupted staging, expired staging is reuploaded and preview stays private',
  async ({ browser }) => {
    const { page } = await openNew(browser);
    await write(page, 'A draft with an informative image.');
    await page.getByRole('button', { name: 'Add image', exact: true }).click();
    await page.getByLabel('Image file', { exact: true }).setInputFiles({
      name: 'synthetic.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        'base64',
      ),
    });
    await page.getByRole('button', { name: 'Insert image', exact: true }).click();
    await expect(
      page.getByRole('dialog', { name: 'Add an image' }).getByRole('alert'),
    ).toContainText('alternative text');
    expect((await current(page)).images).toHaveLength(0);
    await page.getByLabel('Alt text', { exact: true }).fill('A synthetic test pixel');
    await page.getByRole('button', { name: 'Insert image', exact: true }).click();
    await expect.poll(async () => (await current(page)).images.length).toBe(1);
    let before = await current(page);
    expect((await sourceBlobs(page))[0]).toMatchObject({ nativeBlob: true, type: 'image/png' });
    expect((await sourceBlobs(page))[0].size).toBeGreaterThan(0);
    await expect(page.getByRole('img', { name: 'A synthetic test pixel' })).toBeVisible();
    await page.route('**/api/editorial/posts/*/draft', (route) =>
      mutationRoute(route) ? route.abort('connectionreset') : route.continue(),
    );
    await page.getByRole('button', { name: 'Sync', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Sync', exact: true })).toBeEnabled();
    before = await current(page);
    expect(before.pending?.kind).toBe('sync');
    const upload =
      before.pending?.kind === 'sync' && before.pending.uploads.find((item) => item.asset);
    expect(upload).toBeTruthy();
    expect((await sourceBlobs(page))[0].size).toBeGreaterThan(0);
    const versionBefore = postState(before.postId!).post.version;
    control('expire-media', { mediaId: upload && upload.asset!.id });
    await page.unroute('**/api/editorial/posts/*/draft');
    let imageRequests = 0,
      imagesUnavailable = true;
    await page.route('**/api/editorial/posts/*/media/*/w*', async (route) => {
      if (route.request().resourceType() === 'image') {
        imageRequests++;
        if (imagesUnavailable) return route.abort('connectionreset');
      }
      await route.continue();
    });
    await page.getByRole('button', { name: 'Sync', exact: true }).click();
    const after = await synced(page);
    const state = postState(after.postId!);
    expect(state.post.version).toBe(versionBefore + 1);
    expect(state.post.workingRevision?.content.markdown).toMatch(/media:\/\/[a-f0-9-]{36}/);
    expect(state.post.workingRevision?.content.markdown).not.toContain(before.images[0].localId);
    expect(state.media.length).toBe(2);
    expect(after.images).toHaveLength(0);
    const retry = page.getByRole('button', {
      name: 'Retry image: A synthetic test pixel',
      exact: true,
    });
    await expect(retry).toBeVisible();
    // Keep every responsive candidate unavailable until explicit recovery, so
    // an automatic candidate/render retry cannot end the simulated outage early.
    imagesUnavailable = false;
    const delivered = page.waitForResponse(
      (response) =>
        response.request().resourceType() === 'image' &&
        response.url().includes('/api/editorial/posts/'),
    );
    await retry.click();
    expect((await delivered).status()).toBe(200);
    expect(imageRequests).toBeGreaterThan(1);
    const image = page.getByRole('img', { name: 'A synthetic test pixel' });
    await expect(image).toHaveAttribute('src', /\/api\/editorial\/posts\/.*\/media\/.*\/w/);
    const source = await image.getAttribute('src');
    const response = await page.request.get(source!);
    expect(response.status()).toBe(200);
    expect(response.headers()['cache-control']).toContain('no-store');
    const anonymous = await browser.newContext({ baseURL: stack.webOrigin });
    sessions.push(anonymous);
    expect((await anonymous.request.get(source!)).status()).toBe(401);
  },
);

editorTest(
  'a partial two-image upload keeps both sources and retries only the unfinished staging operation',
  async ({ browser }) => {
    const { page } = await openNew(browser);
    await write(page, 'A partially uploaded draft.');
    for (const name of ['First image', 'Second image']) {
      await page.getByRole('button', { name: 'Add image', exact: true }).click();
      await page.getByLabel('Image file', { exact: true }).setInputFiles({
        name: `${name}.png`,
        mimeType: 'image/png',
        buffer: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
          'base64',
        ),
      });
      await page.getByLabel('Alt text', { exact: true }).fill(name);
      await page.getByRole('button', { name: 'Insert image', exact: true }).click();
    }
    await expect.poll(async () => (await current(page)).images.length).toBe(2);
    const initial = await current(page);
    let uploads = 0;
    await page.route('**/api/editorial/posts/*/media', async (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      uploads++;
      expect(route.request().headers()['x-expected-version']).toBeUndefined();
      if (uploads === 2) return route.abort('connectionreset');
      await route.continue();
    });
    await page.getByRole('button', { name: 'Sync', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Sync', exact: true })).toBeEnabled();
    expect(uploads).toBe(2);
    const partial = await current(page);
    expect(partial.pending?.kind).toBe('sync');
    expect(partial.images).toHaveLength(2);
    expect((await sourceBlobs(page)).every((blob) => blob.nativeBlob && blob.size > 0)).toBe(true);
    expect(postState(partial.postId!).post.version).toBe(1);
    expect(postState(partial.postId!).media).toHaveLength(1);
    const pending = partial.pending?.kind === 'sync' ? partial.pending : null;
    const interruptedKey = pending!.uploads[1].key;
    expect(pending!.uploads[0].asset).not.toBeNull();
    expect(pending!.uploads[1].asset).toBeNull();
    await page.unroute('**/api/editorial/posts/*/media');
    let resumedUploads = 0;
    await page.route('**/api/editorial/posts/*/media', async (route) => {
      if (route.request().method() === 'POST') {
        resumedUploads++;
        expect(route.request().headers()['idempotency-key']).toBe(interruptedKey);
        expect(route.request().headers()['x-expected-version']).toBeUndefined();
      }
      await route.continue();
    });
    await page.getByRole('button', { name: 'Sync', exact: true }).click();
    const finished = await synced(page);
    expect(resumedUploads).toBe(1);
    expect(finished.images).toHaveLength(0);
    const state = postState(finished.postId!);
    expect(state.post.version).toBe(2);
    expect(state.revisions).toBe(2);
    expect(state.media).toHaveLength(2);
    for (const image of initial.images)
      expect(state.post.workingRevision!.content.markdown).not.toContain(image.localId);
  },
);

editorTest(
  'decorative image and cover retain empty alternatives and release the temporary Blob URL after sync',
  async ({ browser }) => {
    const { page } = await openNew(browser);
    await write(page, 'A decorative image test.');
    await page.evaluate(() => {
      const revoked: string[] = [];
      (window as Window & { editorRevokedUrls?: string[] }).editorRevokedUrls = revoked;
      const original = URL.revokeObjectURL;
      URL.revokeObjectURL = (url) => {
        revoked.push(url);
        original(url);
      };
    });
    await page.getByRole('button', { name: 'Add image', exact: true }).click();
    await page.getByLabel('Image file', { exact: true }).setInputFiles({
      name: 'decorative.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        'base64',
      ),
    });
    await page.getByLabel('Decorative image', { exact: true }).check();
    await page.getByLabel('Use as cover image', { exact: true }).check();
    await expect(page.getByLabel('Alt text', { exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Insert image', exact: true }).click();
    await expect.poll(async () => (await current(page)).images.length).toBe(1);
    const localImage = page.locator('.editor-preview img').first();
    await expect(localImage).toHaveAttribute('src', /^blob:/);
    await expect(localImage).toHaveAttribute('alt', '');
    const blobUrl = await localImage.getAttribute('src');
    await page.getByRole('button', { name: 'Sync', exact: true }).click();
    const draft = await synced(page);
    const content = postState(draft.postId!).post.workingRevision!.content;
    expect(content.coverDecorative).toBe(true);
    expect(content.coverAltText).toBe('');
    expect(content.markdown).toContain('"decorative"');
    await expect
      .poll(() =>
        page.evaluate(
          (url) =>
            (window as Window & { editorRevokedUrls?: string[] }).editorRevokedUrls?.includes(url!),
          blobUrl,
        ),
      )
      .toBe(true);
    await expect(page.locator('.editor-preview img')).toHaveCount(2);
    for (const image of await page.locator('.editor-preview img').all())
      await expect(image).toHaveAttribute('alt', '');
  },
);

editorTest(
  'author submits the exact synced working revision and withdraws before further editing',
  async ({ browser }) => {
    const { page } = await openNew(browser);
    await write(page, 'Ready for review.');
    await page.getByRole('button', { name: 'Sync', exact: true }).click();
    const saved = await synced(page);
    await page.getByRole('button', { name: 'Submit for review', exact: true }).click();
    await expect.poll(() => postState(saved.postId!).post.workflowState).toBe('IN_REVIEW');
    await expect(page.getByLabel('Markdown', { exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Withdraw from review', exact: true }).click();
    await expect.poll(() => postState(saved.postId!).post.workflowState).toBe('DRAFT');
    await expect(page.getByLabel('Markdown', { exact: true })).toBeEnabled();
  },
);

editorTest(
  'a committed submit with lost response recovers its exact review action after reload',
  async ({ browser }) => {
    const post = control<WorkspacePost>('create-post', {
      content: { markdown: 'This exact revision is ready for review.' },
    });
    const { page } = await openExisting(browser, post);
    let key = '',
      wire = '';
    await page.route('**/api/editorial/posts/*/submit', async (route) => {
      key = route.request().headers()['idempotency-key'];
      wire = route.request().postData()!;
      expect((await route.fetch()).status()).toBe(200);
      await route.abort('connectionreset');
    });
    await page.getByRole('button', { name: 'Submit for review', exact: true }).click();
    await expect.poll(async () => (await current(page)).pending?.kind).toBe('submit');
    await expect(
      page.getByRole('button', { name: 'Retry review action', exact: true }),
    ).toBeEnabled();
    expect(postState(post.id).post.workflowState).toBe('IN_REVIEW');
    await page.unroute('**/api/editorial/posts/*/submit');
    await page.reload();
    let retried = false;
    await page.route('**/api/editorial/posts/*/submit', async (route) => {
      retried = true;
      expect(route.request().headers()['idempotency-key']).toBe(key);
      expect(route.request().postData()).toBe(wire);
      await route.continue();
    });
    await page.getByRole('button', { name: 'Retry review action', exact: true }).click();
    await expect.poll(async () => (await current(page)).pending).toBeNull();
    expect(retried).toBe(true);
    expect((await current(page)).base?.workflowState).toBe('IN_REVIEW');
    expect(postState(post.id).reviews).toBe(1);
  },
);

editorTest(
  'expired session preserves local text and offers reauthentication',
  async ({ browser }) => {
    const { page, session } = await openNew(browser);
    const draft = await write(page, 'Preserve this across session expiry.');
    const expired = control<{ sessionCookie: string }>('expired-session', 'author');
    await session.addCookies([
      {
        name: `blogpost_${stack.name}_session`,
        value: expired.sessionCookie,
        url: stack.webOrigin,
        httpOnly: true,
        sameSite: 'Lax',
      },
    ]);
    await page.getByRole('button', { name: 'Sync', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Sign in again to continue.', exact: true }),
    ).toBeVisible();
    expect((await current(page)).content.markdown).toBe(draft.content.markdown);
    await expect(page.getByRole('button', { name: 'Sign in again', exact: true })).toBeVisible();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export local Markdown', exact: true }).click();
    const exported = readFileSync((await (await download).path())!, 'utf8');
    expect(exported).toContain(draft.content.markdown);
    expect(exported).toContain(draft.content.summary);
  },
);

editorTest(
  'confirmed disablement hides private content, stops sync and retains export recovery',
  async ({ browser }) => {
    const { page } = await openNew(browser);
    const draft = await write(page, 'PRIVATE_EDITOR_DISABLED_RECOVERY');
    const checked = deferred(),
      release = deferred(),
      delivered = deferred();
    await page.route('**/api/session', async (route) => {
      if (route.request().method() !== 'GET') return route.continue();
      const response = await route.fetch();
      expect(response.status()).toBe(200);
      checked.resolve();
      await release.promise;
      await route.fulfill({ response });
      delivered.resolve();
    });
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await checked.promise;
    control('disable', 'author');
    try {
      await page.getByRole('button', { name: 'Sync', exact: true }).click();
      await expect(
        page.getByRole('heading', { name: 'Staff access is unavailable.', exact: true }),
      ).toBeVisible();
      // A real earlier authorized read must not undo the newer confirmed denial.
      release.resolve();
      await delivered.promise;
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      );
      await expect(
        page.getByRole('heading', { name: 'Staff access is unavailable.', exact: true }),
      ).toBeVisible();
      await expect(page.getByLabel('Markdown', { exact: true })).not.toBeVisible();
      await page.getByRole('button', { name: /review local work/i }).click();
      const dialog = page.getByRole('dialog', { name: 'Keep a copy of your unsynced work' });
      await expect(dialog).toBeVisible();
      const download = page.waitForEvent('download');
      await dialog.getByRole('button', { name: 'Export Markdown', exact: true }).click();
      expect(readFileSync((await (await download).path())!, 'utf8')).toContain(
        draft.content.markdown,
      );
    } finally {
      release.resolve();
      control('enable', 'author');
    }
  },
);

editorTest(
  'logout flushes new typing, supports export/cancel and clears only staff storage',
  async ({ browser }) => {
    const { page, session } = await openNew(browser);
    await write(page, 'Existing durable work.');
    await page.evaluate(() => localStorage.setItem('unrelated-reader-preference', 'keep'));
    await page
      .getByLabel('Markdown', { exact: true })
      .fill('Last typing immediately before sign out.');
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Keep a copy of your unsynced work' });
    await expect(dialog).toBeVisible();
    const download = page.waitForEvent('download');
    await dialog.getByRole('button', { name: 'Export Markdown', exact: true }).click();
    expect(readFileSync((await (await download).path())!, 'utf8')).toContain(
      'Last typing immediately before sign out.',
    );
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByLabel('Markdown', { exact: true })).toHaveValue(
      'Last typing immediately before sign out.',
    );
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await dialog
      .getByRole('button', { name: 'Remove local work and sign out', exact: true })
      .click();
    await expect(page).toHaveURL(stack.webOrigin + '/');
    expect(
      (await session.cookies()).some((cookie) => cookie.name === `blogpost_${stack.name}_session`),
    ).toBe(false);
    expect(
      await page.evaluate(
        (namespace) => ({
          staffKeys: Object.keys(localStorage).filter((key) => key.startsWith(namespace)),
          preference: localStorage.getItem('unrelated-reader-preference'),
        }),
        namespace,
      ),
    ).toEqual({ staffKeys: [], preference: 'keep' });
    expect(
      await page.evaluate(
        async (databaseName) =>
          (await indexedDB.databases()).some((database) => database.name === databaseName),
        databaseName,
      ),
    ).toBe(false);
  },
);

editorTest(
  'logout cannot clear another open writing tab before its recovery/export',
  async ({ browser }) => {
    const { page, session } = await openNew(browser);
    await write(page, 'A shared draft before logout.');
    const second = await session.newPage();
    await second.goto(page.url());
    await expect(second.getByLabel('Markdown', { exact: true })).toBeVisible();
    await second
      .getByLabel('Markdown', { exact: true })
      .fill('Work in the other open writing tab.');
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Keep a copy of your unsynced work' });
    await expect(dialog).toBeVisible();
    await dialog
      .getByRole('button', { name: 'Remove local work and sign out', exact: true })
      .click();
    await expect(dialog.getByRole('alert')).toContainText('Sign-out could not be confirmed');
    await expect(
      second
        .getByRole('alert')
        .filter({ hasText: /another tab.*clear|sign-out/i })
        .first(),
    ).toBeVisible();
    expect(
      (await session.cookies()).some((cookie) => cookie.name === `blogpost_${stack.name}_session`),
    ).toBe(true);
    const download = second.waitForEvent('download');
    await second.getByRole('button', { name: 'Export Markdown', exact: true }).first().click();
    expect(readFileSync((await (await download).path())!, 'utf8')).toContain(
      'Work in the other open writing tab.',
    );
    await second.close();
    await dialog
      .getByRole('button', { name: 'Remove local work and sign out', exact: true })
      .click();
    await expect(page).toHaveURL(stack.webOrigin + '/');
    expect(
      (await session.cookies()).some((cookie) => cookie.name === `blogpost_${stack.name}_session`),
    ).toBe(false);
  },
);

editorTest(
  'profile logout finds durable drafts after the editor provider has unmounted',
  async ({ browser }) => {
    const { page } = await openNew(browser);
    const draft = await write(page, 'A durable draft recoverable from the profile page.');
    await page.goto('/studio/profile');
    await expect(page.getByRole('heading', { name: 'Your staff profile' })).toBeVisible();
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Keep a copy of your unsynced work' });
    await expect(dialog).toContainText(draft.content.title);
    const download = page.waitForEvent('download');
    await dialog.getByRole('button', { name: 'Export Markdown', exact: true }).click();
    const exported = readFileSync((await (await download).path())!, 'utf8');
    expect(exported).toContain(draft.content.markdown);
    expect(exported).toContain(draft.content.summary);
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    expect((await records(page)).some((item) => item.clientDraftId === draft.clientDraftId)).toBe(
      true,
    );
  },
);

editorTest(
  'missing account pointer cannot silently clear surviving durable drafts from another staff page',
  async ({ browser }) => {
    const { page, session } = await openNew(browser);
    const draft = await write(page, 'Surviving draft with a missing browser account pointer.');
    await page.goto('/studio/profile');
    await page.evaluate((namespace) => localStorage.removeItem(`${namespace}:identity`), namespace);
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(
      page
        .getByRole('alert')
        .filter({ hasText: /couldn’t check local staff work|sign-out is paused/i }),
    ).toBeVisible();
    await expect(page).toHaveURL(stack.webOrigin + '/studio/profile');
    expect(
      (await session.cookies()).some((cookie) => cookie.name === `blogpost_${stack.name}_session`),
    ).toBe(true);
    expect((await records(page)).some((item) => item.clientDraftId === draft.clientDraftId)).toBe(
      true,
    );
  },
);

editorTest(
  'an evicted local draft shows explicit recovery guidance without inventing a saved replacement',
  async ({ browser }) => {
    const { page } = await openNew(browser);
    const draft = await write(page, 'An intentionally evicted local-only draft.');
    const path = new URL(page.url()).pathname + new URL(page.url()).search;
    await page.goto('/studio/profile');
    await page.evaluate(async (databaseName) => {
      const request = indexedDB.deleteDatabase(databaseName);
      await new Promise<void>((resolve, reject) => {
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error('Test editor connection did not close'));
      });
    }, databaseName);
    await page.goto(path);
    await expect(
      page.getByRole('heading', { name: 'Device draft unavailable', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('alert').filter({ hasText: /missing|evicted|cleared/i }),
    ).toBeVisible();
    await expect(page.getByText(/^Saved on this device at /)).not.toBeVisible();
    expect((await records(page)).length).toBe(0);
    expect(
      control<{ count: number }>('post-count', { clientDraftId: draft.clientDraftId }).count,
    ).toBe(0);
  },
);

editorTest(
  'a real account change between server rendering and editor configuration hides cached private writing',
  async ({ browser }) => {
    const { page, session } = await openNew(browser);
    const draft = await write(page, 'PRIVATE_EDITOR_ACCOUNT_CHANGE_RECOVERY');
    const path = new URL(page.url()).pathname + new URL(page.url()).search;
    await page.goto('/studio/profile');
    const other = await login(browser, 'other');
    const replacement = (await other.session.cookies()).find(
      (cookie) => cookie.name === `blogpost_${stack.name}_session`,
    )!;
    await page.route(
      (url) => url.pathname === '/studio/posts/new',
      async (route) => {
        // Both responses are real. Complete the authorized old account's page render,
        // then change the actual browser session before its first client config read.
        const response = await route.fetch();
        await session.addCookies([replacement]);
        await route.fulfill({ response });
      },
    );
    await page.goto(path);
    await expect(
      page.getByRole('heading', { name: 'Staff access is unavailable.', exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel('Markdown', { exact: true })).not.toBeVisible();
    const saved = (await records(page)).find((item) => item.clientDraftId === draft.clientDraftId)!;
    expect(saved.content.markdown).toBe(draft.content.markdown);
    expect(saved.uid).toBe(draft.uid);
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export local Markdown', exact: true }).click();
    expect(readFileSync((await (await download).path())!, 'utf8')).toContain(
      draft.content.markdown,
    );
  },
);

editorTest(
  'workspace list hides a cached private server title after real author reassignment',
  async ({ browser }) => {
    const marker = `PRIVATE_REASSIGNED_${randomUUID()}`;
    const post = control<WorkspacePost>('create-post', { content: { title: marker } });
    const { page } = await openExisting(browser, post);
    control('reassign-post', { postId: post.id, label: 'other' });
    const reached = deferred(),
      release = deferred();
    await page.route(
      (url) => url.pathname === '/api/editorial/posts',
      async (route) => {
        if (route.request().method() !== 'GET') return route.continue();
        reached.resolve();
        await release.promise;
        await route.continue();
      },
    );
    await page.getByRole('link', { name: 'All your drafts', exact: true }).click();
    await reached.promise;
    await expect(page.getByText(marker, { exact: true })).not.toBeVisible();
    const response = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/api/editorial/posts' &&
        response.request().method() === 'GET',
    );
    release.resolve();
    expect((await response).status()).toBe(200);
    await expect(page.getByText(marker, { exact: true })).not.toBeVisible();
    expect((await records(page)).find((draft) => draft.postId === post.id)?.content.title).toBe(
      marker,
    );
  },
);

editorTest(
  'phone and desktop editor reflow, both themes, keyboard tabs, toolbar and axe',
  async ({ browser }) => {
    const { page } = await openNew(browser);
    await write(
      page,
      '# Accessible preview\n\n| Name | Value |\n| --- | --- |\n| Test | True |\n\n```js\nconst safe = true;\n```',
    );
    for (const theme of ['light', 'dark'] as const) {
      await page.evaluate((theme) => (document.documentElement.dataset.theme = theme), theme);
      for (const viewport of [
        { width: 1440, height: 1000 },
        { width: 390, height: 844 },
        { width: 320, height: 800 },
      ]) {
        await page.setViewportSize(viewport);
        if (viewport.width < 600) {
          const writeTab = page.getByRole('tab', { name: 'Write', exact: true });
          const previewTab = page.getByRole('tab', { name: 'Preview', exact: true });
          await writeTab.focus();
          await writeTab.press('ArrowRight');
          await expect(previewTab).toBeFocused();
          await expect(previewTab).toHaveAttribute('aria-selected', 'true');
          await expect(page.getByRole('heading', { name: 'Accessible preview' })).toBeVisible();
          expect(
            (
              await new AxeBuilder({ page })
                .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
                .analyze()
            ).violations,
          ).toEqual([]);
          await previewTab.press('ArrowLeft');
          await expect(writeTab).toBeFocused();
          await page.getByLabel('Markdown', { exact: true }).focus();
          await expect(page.getByLabel('Markdown', { exact: true })).toBeFocused();
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        const scan = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
          .analyze();
        expect(
          scan.violations.map((violation) => ({
            id: violation.id,
            impact: violation.impact,
            nodes: violation.nodes.map((node) => node.target),
          })),
        ).toEqual([]);
      }
    }
    await page.getByLabel('Markdown', { exact: true }).fill('Selected text');
    await page.getByLabel('Markdown', { exact: true }).selectText();
    await page.getByRole('button', { name: 'Bold', exact: true }).click();
    await expect(page.getByLabel('Markdown', { exact: true })).toHaveValue('**Selected text**');
  },
);
