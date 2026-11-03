import { randomUUID } from 'node:crypto';
import type { BrowserContext, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { ManagedTaxon } from '../../src/features/taxonomy/taxonomy-contract';
import type { WorkspacePost } from '../../src/features/editor/editor-contract';
import { test, expect, login, control, staffMutation } from './staff-test-helpers';

function vocabulary(prefix: string) {
  const suffix = randomUUID();
  return { name: `${prefix} ${suffix}`, slug: `taxon-${suffix}` };
}
async function create(session: BrowserContext, kind: 'categories' | 'tags', prefix: string) {
  const input = vocabulary(prefix);
  const result = await staffMutation(session, `/${kind}`, { content: input });
  expect(result.response.status()).toBe(201);
  return result.body.data as ManagedTaxon;
}
async function get(session: BrowserContext, kind: 'categories' | 'tags', id: string) {
  const response = await session.request.get(`/api/editorial/${kind}/${id}`);
  expect(response.status()).toBe(200);
  expect(response.headers()['cache-control']).toContain('no-store');
  return (await response.json()).data as ManagedTaxon;
}
async function open(page: Page, kind: 'categories' | 'tags' = 'categories') {
  await page.goto('/studio/taxonomy');
  await expect(
    page.getByRole('heading', { name: 'Taxonomy workspace', exact: true }),
  ).toBeVisible();
  if (kind === 'tags') await page.getByRole('button', { name: 'Tags', exact: true }).click();
  await expect(page.getByRole('table')).toBeVisible();
}
async function findEntry(page: Page, name: string) {
  for (;;) {
    const button = page.getByRole('button', { name: `Manage ${name}`, exact: true });
    if (await button.count()) {
      await button.click();
      return;
    }
    const next = page.getByRole('button', { name: 'Next page', exact: true });
    expect(await next.isEnabled()).toBe(true);
    const caption = await page.locator('caption').textContent();
    const nextPage = Number(caption?.match(/page (\d+)$/)?.[1]) + 1;
    await next.click();
    await expect(page.getByRole('table')).toHaveAccessibleName(new RegExp(`page ${nextPage}$`));
  }
}
function editor(page: Page, title: string) {
  return page.getByRole('region', { name: title, exact: true });
}
async function confirmChanges(page: Page, waitForSettled = true) {
  await page.getByRole('button', { name: 'Review changes', exact: true }).click();
  const confirmation = page.getByRole('region', { name: 'Confirm taxonomy changes', exact: true });
  await confirmation.getByRole('button', { name: 'Save taxonomy changes', exact: true }).click();
  if (waitForSettled) await expect(confirmation).toHaveCount(0);
}

test('taxonomy requires editor/admin page and data permission, including write attempts', async ({
  browser,
}) => {
  const { session, page } = await login(browser, 'author');
  await page.goto('/studio/taxonomy');
  await expect(
    page.getByRole('heading', { name: 'This area is not available for your role.' }),
  ).toBeVisible();
  await expect(page.getByRole('table')).toHaveCount(0);
  expect((await session.request.get('/api/editorial/categories?page=1&pageSize=50')).status()).toBe(
    403,
  );
  const rejected = await staffMutation(session, '/tags', {
    content: vocabulary('Forbidden taxonomy'),
  });
  expect(rejected.response.status()).toBe(403);
  expect(rejected.body.data).toBeNull();
});

test('editor creates, renames, archives and reactivates a category while its slug remains immutable', async ({
  browser,
}) => {
  const { session, page } = await login(browser, 'editor');
  const input = vocabulary('A category');
  await open(page);
  await page.getByRole('button', { name: 'Create category', exact: true }).click();
  const form = editor(page, 'Create a category');
  await form.getByLabel('Name', { exact: true }).fill(`  ${input.name}  `);
  await form.getByLabel('Slug', { exact: true }).fill(input.slug);
  await form.getByRole('button', { name: 'Review new entry' }).click();
  const confirmation = page.getByRole('region', { name: 'Confirm new category', exact: true });
  await confirmation.getByRole('button', { name: 'Create category', exact: true }).click();
  const current = editor(page, `Edit ${input.name}`);
  await expect(current).toBeVisible();
  await expect(current.getByLabel('Slug', { exact: true })).toHaveAttribute('readonly', '');
  const renamed = `${input.name} renamed`;
  await current.getByLabel('Name', { exact: true }).fill(renamed);
  await current.getByLabel('Active for new publication').uncheck();
  await page.getByRole('button', { name: 'Review changes', exact: true }).click();
  const archive = page.getByRole('region', { name: 'Confirm taxonomy changes', exact: true });
  await expect(archive).toContainText(
    'Existing public articles, drafts and immutable revisions keep their references.',
  );
  await expect(archive).toContainText('choose an active category');
  await archive.getByRole('button', { name: 'Save taxonomy changes', exact: true }).click();
  await expect(editor(page, `Edit ${renamed}`)).toBeVisible();
  await page.getByLabel('Show categories').selectOption('archived');
  const row = page
    .getByRole('row')
    .filter({ has: page.getByRole('button', { name: `Manage ${renamed}`, exact: true }) });
  await expect(row).toContainText('Archived');
  await expect(row).toContainText(input.slug);
  await editor(page, `Edit ${renamed}`).getByLabel('Active for new publication').check();
  await confirmChanges(page);
  await expect(
    editor(page, `Edit ${renamed}`).getByLabel('Active for new publication'),
  ).toBeChecked();
  await page.getByLabel('Show categories').selectOption('active');
  await expect(page.getByRole('button', { name: `Manage ${renamed}`, exact: true })).toBeVisible();
  const response = await session.request.get(
    '/api/editorial/categories?page=1&pageSize=50&active=true',
  );
  expect(response.status()).toBe(200);
  const item = (await response.json()).data.find(
    (taxon: ManagedTaxon) => taxon.slug === input.slug,
  ) as ManagedTaxon;
  expect(item.name).toBe(renamed);
  expect(item.active).toBe(true);
  expect(item.slug).toBe(input.slug);
  expect(item.version).toBe(3);
});

test('tag creation reports normalized-name and immutable-slug duplicates while retaining the proposal', async ({
  browser,
}) => {
  const { session, page } = await login(browser, 'editor');
  const input = vocabulary('A Café');
  const created = await staffMutation(session, '/tags', { content: input });
  expect(created.response.status()).toBe(201);
  await open(page, 'tags');
  await page.getByRole('button', { name: 'Create tag', exact: true }).click();
  const form = editor(page, 'Create a tag');
  const duplicateName = `  ${input.name.toUpperCase().normalize('NFD')}  `;
  await form.getByLabel('Name', { exact: true }).fill(duplicateName);
  await form.getByLabel('Slug', { exact: true }).fill(`other-${randomUUID()}`);
  await form.getByRole('button', { name: 'Review new entry' }).click();
  await page
    .getByRole('region', { name: 'Confirm new tag', exact: true })
    .getByRole('button', { name: 'Create tag', exact: true })
    .click();
  await expect(form.getByRole('alert')).toContainText(
    'This taxonomy name already exists after normalization.',
  );
  await expect(form.getByLabel('Name', { exact: true })).toHaveValue(duplicateName);
  await form.getByLabel('Name', { exact: true }).fill(vocabulary('Unique tag name').name);
  await form.getByLabel('Slug', { exact: true }).fill(input.slug);
  await form.getByRole('button', { name: 'Review new entry' }).click();
  await page
    .getByRole('region', { name: 'Confirm new tag', exact: true })
    .getByRole('button', { name: 'Create tag', exact: true })
    .click();
  await expect(form.getByRole('alert')).toContainText('This taxonomy slug already exists.');
  expect((await get(session, 'tags', created.body.data.id)).version).toBe(1);
});

test('archiving used vocabulary preserves published and historical references and requires active replacement before resubmission', async ({
  browser,
}) => {
  const { session, page } = await login(browser, 'editor');
  const category = await create(session, 'categories', 'A used category');
  const tag = await create(session, 'tags', 'A used tag');
  const post = control<WorkspacePost>('create-post', {
    published: true,
    content: {
      title: `Synthetic taxonomy reference ${randomUUID()}`,
      categoryId: category.id,
      tagIds: [tag.id],
    },
  });
  await open(page);
  await findEntry(page, category.name);
  const form = editor(page, `Edit ${category.name}`);
  await expect(form).toContainText('1 published and 1 working revisions');
  await form.getByLabel('Active for new publication').uncheck();
  await confirmChanges(page);
  await expect(form.getByLabel('Active for new publication')).not.toBeChecked();
  const archived = await get(session, 'categories', category.id);
  expect(archived.active).toBe(false);
  expect(archived.usage).toEqual({ publishedCount: 1, draftCount: 1 });
  const publicResponse = await session.request.get(`/posts/${post.slug}`);
  expect(publicResponse.status()).toBe(200);
  expect(await publicResponse.text()).toContain(post.publishedRevision!.content.title);
  const state = control<{ post: WorkspacePost; revisions: number }>('post-state', {
    postId: post.id,
  });
  expect(state.post.publishedRevision!.content.categoryId).toBe(category.id);
  expect(state.post.workingRevision!.content.categoryId).toBe(category.id);
  expect(state.revisions).toBe(1);
  const changed = control<WorkspacePost>('advance-post', {
    postId: post.id,
    content: { markdown: 'Updated synthetic text with retained category.' },
  });
  const rejected = await staffMutation(session, `/posts/${post.id}/submit`, {
    version: changed.version,
    content: { revisionId: changed.workingRevisionId },
  });
  expect(rejected.response.status()).toBe(409);
  expect(rejected.body.error.code).toBe('WORKFLOW_CONFLICT');
  const prepared = control<{ category: ManagedTaxon }>('prepare');
  const repaired = control<WorkspacePost>('advance-post', {
    postId: post.id,
    content: { categoryId: prepared.category.id },
  });
  const submitted = await staffMutation(session, `/posts/${post.id}/submit`, {
    version: repaired.version,
    content: { revisionId: repaired.workingRevisionId },
  });
  expect(submitted.response.status()).toBe(200);
  expect(submitted.body.data.workflowState).toBe('IN_REVIEW');
});

test('stale taxonomy version keeps the proposal and requires explicit comparison and a newly confirmed version', async ({
  browser,
}) => {
  const { session, page } = await login(browser, 'editor');
  const taxon = await create(session, 'tags', 'A stale taxonomy');
  await open(page, 'tags');
  await findEntry(page, taxon.name);
  const proposed = `${taxon.name} proposed`;
  const concurrent = `${taxon.name} concurrent`;
  await editor(page, `Edit ${taxon.name}`).getByLabel('Name', { exact: true }).fill(proposed);
  const remote = await staffMutation(session, `/tags/${taxon.id}`, {
    method: 'PATCH',
    version: taxon.version,
    content: { name: concurrent },
  });
  expect(remote.response.status()).toBe(200);
  const attempts: { key: string | undefined; version: string | undefined; body: string | null }[] =
    [];
  await page.route(`**/api/editorial/tags/${taxon.id}`, async (route) => {
    const request = route.request();
    if (request.method() === 'PATCH')
      attempts.push({
        key: request.headers()['idempotency-key'],
        version: request.headers()['x-expected-version'],
        body: request.postData(),
      });
    await route.continue();
  });
  await confirmChanges(page);
  await expect(
    page.getByRole('heading', { name: 'Another editor changed this entry' }),
  ).toBeVisible();
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue(proposed);
  await expect(page.getByRole('button', { name: 'Review changes', exact: true })).toBeDisabled();
  expect(attempts).toHaveLength(1);
  expect((await get(session, 'tags', taxon.id)).name).toBe(concurrent);
  await page.getByRole('button', { name: 'Load current version to compare' }).click();
  await expect(page.getByText(`Current version 2:`, { exact: false })).toContainText(concurrent);
  await page.getByRole('button', { name: 'Use this version and review my changes again' }).click();
  await confirmChanges(page);
  await expect(editor(page, `Edit ${proposed}`)).toBeVisible();
  expect(attempts).toHaveLength(2);
  expect(attempts.map((attempt) => attempt.version)).toEqual(['1', '2']);
  expect(attempts[0].key).not.toBe(attempts[1].key);
  expect(JSON.parse(attempts[1].body!)).toEqual({ name: proposed });
  expect((await get(session, 'tags', taxon.id)).version).toBe(3);
});

test('lost taxonomy create response retries identical captured input and key without duplicate creation', async ({
  browser,
}) => {
  const { session, page } = await login(browser, 'editor');
  const input = vocabulary('A uncertain category');
  await open(page);
  await page.getByRole('button', { name: 'Create category', exact: true }).click();
  await page.getByLabel('Name', { exact: true }).fill(input.name);
  await page.getByLabel('Slug', { exact: true }).fill(input.slug);
  const attempts: { key: string | undefined; body: string | null }[] = [];
  let createdId = '';
  await page.route('**/api/editorial/categories', async (route) => {
    const request = route.request();
    if (request.method() !== 'POST') return route.continue();
    attempts.push({ key: request.headers()['idempotency-key'], body: request.postData() });
    if (attempts.length === 1) {
      const response = await route.fetch();
      expect(response.status()).toBe(201);
      createdId = (await response.json()).data.id;
      await route.abort('failed');
    } else if (attempts.length === 2) {
      const rejectedHeaders = { ...request.headers() };
      delete rejectedHeaders['x-csrf-token'];
      await route.continue({ headers: rejectedHeaders });
    } else await route.continue();
  });
  await page.getByRole('button', { name: 'Review new entry' }).click();
  await page
    .getByRole('region', { name: 'Confirm new category', exact: true })
    .getByRole('button', { name: 'Create category', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'The update outcome is unknown' })).toBeVisible();
  await expect(page.getByLabel('Name', { exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Tags', exact: true })).toBeDisabled();
  const securityFailure = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === '/api/editorial/categories' && response.status() === 403,
  );
  await page.getByRole('button', { name: 'Retry the same request' }).click();
  await securityFailure;
  await expect(page.getByRole('button', { name: 'Retry the same request' })).toBeEnabled();
  await page.getByRole('button', { name: 'Retry the same request' }).click();
  await expect(editor(page, `Edit ${input.name}`)).toBeVisible();
  expect(attempts).toHaveLength(3);
  expect(attempts[0]).toEqual(attempts[1]);
  expect(attempts[0]).toEqual(attempts[2]);
  const result = await get(session, 'categories', createdId);
  expect(result.version).toBe(1);
  expect(result.slug).toBe(input.slug);
  expect(
    (await session.request.get(`/api/editorial/categories/${createdId}`)).headers()[
      'x-resource-version'
    ],
  ).toBe('1');
});

test('uncertain taxonomy action stops after the replay window and resolves by authorized current-state review', async ({
  browser,
}) => {
  const { session, page } = await login(browser, 'editor');
  const taxon = await create(session, 'tags', 'A retry window');
  await open(page, 'tags');
  await findEntry(page, taxon.name);
  const renamed = `${taxon.name} changed`;
  await page.getByLabel('Name', { exact: true }).fill(renamed);
  let writes = 0;
  await page.route(`**/api/editorial/tags/${taxon.id}`, async (route) => {
    if (route.request().method() !== 'PATCH') return route.continue();
    writes++;
    const response = await route.fetch();
    expect(response.status()).toBe(200);
    await route.abort('failed');
  });
  await confirmChanges(page, false);
  await expect(page.getByRole('heading', { name: 'The update outcome is unknown' })).toBeVisible();
  await page.clock.install({ time: new Date() });
  await page.clock.setFixedTime(new Date(Date.now() + 24 * 60 * 60 * 1000 + 60_000));
  await page.getByRole('button', { name: 'Retry the same request' }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: '24-hour retry window has ended' }),
  ).toBeVisible();
  expect(writes).toBe(1);
  await page.getByRole('button', { name: 'Check current entry without changing it' }).click();
  await expect(page.getByText('Current server state:', { exact: false })).toContainText(renamed);
  await page.getByRole('button', { name: 'I reviewed this state; open the current entry' }).click();
  await expect(editor(page, `Edit ${renamed}`)).toBeVisible();
  expect((await get(session, 'tags', taxon.id)).version).toBe(2);
  expect(writes).toBe(1);
});

test('a late taxonomy selection cannot replace an entry with an in-flight or uncertain saved change', async ({
  browser,
}) => {
  const { session, page } = await login(browser, 'editor');
  const first = await create(session, 'categories', 'Race selection');
  const retained = await create(session, 'categories', 'Race command');
  const proposed = `${retained.name} changed`;
  await open(page);
  await findEntry(page, retained.name);
  const form = editor(page, `Edit ${retained.name}`);
  await form.getByLabel('Name', { exact: true }).fill(proposed);

  let releaseSelection!: () => void;
  const selectionGate = new Promise<void>((resolve) => {
    releaseSelection = resolve;
  });
  let selectionStarted!: () => void;
  const selectionReady = new Promise<void>((resolve) => {
    selectionStarted = resolve;
  });
  let releaseWrite!: () => void;
  const writeGate = new Promise<void>((resolve) => {
    releaseWrite = resolve;
  });
  let writeCommitted!: () => void;
  const committed = new Promise<void>((resolve) => {
    writeCommitted = resolve;
  });
  const selectionPath = `**/api/editorial/categories/${first.id}`;
  const writePath = `**/api/editorial/categories/${retained.id}`;
  const attempts: { key?: string; version?: string; body: string | null }[] = [];
  await page.route(selectionPath, async (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    const response = await route.fetch();
    expect(response.status()).toBe(200);
    selectionStarted();
    await selectionGate;
    await route.fulfill({ response });
  });
  await page.route(writePath, async (route) => {
    if (route.request().method() !== 'PATCH') return route.continue();
    attempts.push({
      key: route.request().headers()['idempotency-key'],
      version: route.request().headers()['x-expected-version'],
      body: route.request().postData(),
    });
    if (attempts.length > 1) return route.continue();
    const response = await route.fetch();
    expect(response.status()).toBe(200);
    writeCommitted();
    await writeGate;
    await route.abort('connectionreset');
  });
  try {
    await page.getByRole('button', { name: `Manage ${first.name}`, exact: true }).click();
    await selectionReady;
    await form.getByRole('button', { name: 'Review changes', exact: true }).click();
    await page
      .getByRole('region', { name: 'Confirm taxonomy changes', exact: true })
      .getByRole('button', { name: 'Save taxonomy changes', exact: true })
      .click();
    await committed;
    await expect(
      page.getByRole('button', { name: `Manage ${first.name}`, exact: true }),
    ).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Tags', exact: true })).toBeDisabled();
    const delivered = page.waitForResponse(
      (response) =>
        response.url().endsWith(`/api/editorial/categories/${first.id}`) &&
        response.request().method() === 'GET',
    );
    releaseSelection();
    await delivered;
    // Let the fulfilled read's continuation and rendering run before losing the save response.
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        }),
    );
    await expect(form).toBeVisible();
    await expect(form.getByLabel('Name', { exact: true })).toHaveValue(proposed);
    await expect(editor(page, `Edit ${first.name}`)).toHaveCount(0);
    releaseWrite();
    await expect(
      form.getByRole('heading', { name: 'The update outcome is unknown', exact: true }),
    ).toBeVisible();
    const retry = form.getByRole('button', { name: 'Retry the same request', exact: true });
    await expect(retry).toBeEnabled();
    await expect(
      page.getByRole('button', { name: `Manage ${first.name}`, exact: true }),
    ).toBeDisabled();
    await retry.click();
    await expect(editor(page, `Edit ${proposed}`)).toBeVisible();
    expect(attempts).toHaveLength(2);
    expect(attempts[1]).toEqual(attempts[0]);
    expect(attempts[0].version).toBe(String(retained.version));
    expect(JSON.parse(attempts[0].body!)).toEqual({ name: proposed });
    const unchanged = await get(session, 'categories', first.id);
    expect(unchanged.name).toBe(first.name);
    expect(unchanged.version).toBe(first.version);
    const changed = await get(session, 'categories', retained.id);
    expect(changed.name).toBe(proposed);
    expect(changed.version).toBe(retained.version + 1);
  } finally {
    releaseSelection();
    releaseWrite();
    await page.unroute(selectionPath);
    await page.unroute(writePath);
  }
});

test('managed taxonomy traverses every server page and keeps active and archived filters distinct', async ({
  browser,
}) => {
  test.setTimeout(180_000);
  const { session, page } = await login(browser, 'editor');
  const suffix = randomUUID();
  const created: ManagedTaxon[] = [];
  for (let index = 0; index < 51; index++) {
    const result = await staffMutation(session, '/tags', {
      content: {
        name: `Pagination ${suffix} ${String(index).padStart(2, '0')}`,
        slug: `pagination-${suffix}-${index}`,
      },
    });
    expect(result.response.status()).toBe(201);
    created.push(result.body.data);
  }
  const archived = await staffMutation(session, `/tags/${created[50].id}`, {
    method: 'PATCH',
    version: 1,
    content: { active: false },
  });
  expect(archived.response.status()).toBe(200);
  const response = await session.request.get('/api/editorial/tags?page=1&pageSize=50');
  expect(response.status()).toBe(200);
  const {
    meta: { pagination },
  } = await response.json();
  expect(pagination.totalPages).toBeGreaterThan(1);
  await open(page, 'tags');
  const entries: string[] = [];
  for (let current = 1; current <= pagination.totalPages; current++) {
    await expect(page.getByRole('table')).toHaveAccessibleName(`Tags · page ${current}`);
    entries.push(...(await page.locator('tbody tr th small').allTextContents()));
    if (current < pagination.totalPages)
      await page.getByRole('button', { name: 'Next page', exact: true }).click();
  }
  expect(new Set(entries).size).toBe(pagination.totalItems);
  for (const taxon of created) expect(entries).toContain(taxon.slug);
  await expect(page.getByRole('button', { name: 'Next page', exact: true })).toBeDisabled();
  await page.getByLabel('Show tags').selectOption('archived');
  await expect(
    page.getByRole('button', { name: `Manage ${created[50].name}`, exact: true }),
  ).toBeVisible();
  for (const row of await page.locator('tbody tr').allTextContents())
    expect(row).toContain('Archived');
  await page.getByLabel('Show tags').selectOption('active');
  await expect(page.getByRole('table')).toHaveAccessibleName('Tags · page 1');
  for (const row of await page.locator('tbody tr').allTextContents())
    expect(row).not.toContain('Archived');
});

test('taxonomy keyboard confirmation, focus restoration, phone reflow and both themes pass axe', async ({
  browser,
}) => {
  const { page } = await login(browser, 'editor');
  const input = vocabulary('Accessible taxonomy');
  await open(page);
  const createButton = page.getByRole('button', { name: 'Create category', exact: true });
  await createButton.focus();
  await createButton.press('Enter');
  await expect(page.getByRole('heading', { name: 'Create a category', exact: true })).toBeFocused();
  await page.getByLabel('Name', { exact: true }).fill(input.name);
  await page.getByLabel('Slug', { exact: true }).fill(input.slug);
  const review = page.getByRole('button', { name: 'Review new entry', exact: true });
  await review.focus();
  await review.press('Enter');
  await expect(
    page.getByRole('heading', { name: 'Confirm new category', exact: true }),
  ).toBeFocused();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(review).toBeFocused();
  for (const theme of ['light', 'dark']) {
    await page.evaluate((value) => {
      document.documentElement.dataset.theme = value;
    }, theme);
    for (const viewport of [
      { width: 1440, height: 1000 },
      { width: 390, height: 844 },
      { width: 320, height: 800 },
    ]) {
      await page.setViewportSize(viewport);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      if (viewport.width < 400) {
        const tableRegion = page.getByRole('region', { name: 'Categories table', exact: true });
        expect(
          await tableRegion.evaluate((element) => element.scrollWidth > element.clientWidth),
        ).toBe(true);
        await tableRegion.evaluate((element) => {
          element.scrollLeft = 0;
        });
        await tableRegion.focus();
        await page.keyboard.press('ArrowRight');
        await expect
          .poll(() => tableRegion.evaluate((element) => element.scrollLeft))
          .toBeGreaterThan(0);
      }
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
});
