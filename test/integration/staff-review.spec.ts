import { randomUUID } from 'node:crypto';
import type { BrowserContext, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type {
  WorkspacePost,
  WorkspacePostSummary,
} from '../../src/features/editor/editor-contract';
import type { components } from '../../src/lib/api-types';
import {
  test,
  expect,
  login,
  control,
  staffMutation,
  waitForStaffCapacity,
} from './staff-test-helpers';

async function current(session: BrowserContext, id: string): Promise<WorkspacePost> {
  const response = await session.request.get(`/api/editorial/posts/${id}`);
  expect(response.status()).toBe(200);
  return (await response.json()).data;
}
async function submit(session: BrowserContext, post: WorkspacePost) {
  const result = await staffMutation(session, `/posts/${post.id}/submit`, {
    version: post.version,
    content: { revisionId: post.workingRevisionId },
  });
  expect(result.response.status()).toBe(200);
  return result.body.data as WorkspacePost;
}
async function openEditor(page: Page, id: string) {
  await page.goto(`/studio/posts/${id}`);
  await expect(page.getByRole('heading', { name: 'Write a draft', exact: true })).toBeVisible();
  await expect(page.getByLabel('Title', { exact: true })).toBeVisible();
}
async function openReview(page: Page, id: string) {
  await page.goto(`/studio/review/${id}`);
  await expect(
    page.getByRole('heading', { name: 'Review submitted work', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Review and publish', exact: true })).toBeEnabled();
}
async function publish(page: Page) {
  await page.getByRole('button', { name: 'Review and publish', exact: true }).click();
  await expect(page.getByRole('heading', { name: /^Publish revision \d+\?$/ })).toBeFocused();
  await page.getByRole('button', { name: 'Confirm review and publish', exact: true }).click();
  await expect(
    page.getByText('No revision is currently submitted.', { exact: false }),
  ).toBeVisible();
}
async function sync(page: Page) {
  await page.getByRole('button', { name: 'Sync', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Draft save status' })).toContainText(
    'All captured changes synced',
  );
}
async function submitInEditor(page: Page) {
  await page.getByRole('button', { name: 'Submit for review', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Withdraw from review', exact: true }),
  ).toBeEnabled();
}
async function cursorData<T>(session: BrowserContext, path: string): Promise<T[]> {
  const data: T[] = [];
  const seen = new Set<string>();
  let cursor: string | null = null;
  for (;;) {
    const query = new URLSearchParams({ pageSize: '20' });
    if (cursor) query.set('cursor', cursor);
    const response = await session.request.get(`/api/editorial${path}?${query}`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.meta.pagination.kind).toBe('CURSOR');
    data.push(...body.data);
    cursor = body.meta.pagination.nextCursor;
    expect(body.meta.pagination.hasMore).toBe(cursor !== null);
    if (!cursor) return data;
    expect(seen.has(cursor)).toBe(false);
    seen.add(cursor);
  }
}

test('author edits, uploads and submits; editor publishes exact content, then publishes a correction without exposing working changes', async ({
  browser,
}) => {
  test.setTimeout(150_000);
  const vocabulary = control<{
    category: { id: string; name: string };
    tags: { id: string; name: string }[];
  }>('prepare');
  const created = control<WorkspacePost>('create-post', {
    content: { title: `Staff publishing ${randomUUID()}`, markdown: 'Initial review body.' },
  });
  const author = await login(browser);
  const editor = await login(browser, 'editor');
  await openEditor(author.page, created.id);
  const title = `A reviewed web article ${randomUUID()}`;
  await author.page.getByLabel('Title', { exact: true }).fill(title);
  await author.page
    .getByLabel('Markdown', { exact: true })
    .fill('## A clear argument\n\nPublished through staff review.');
  await author.page.getByRole('button', { name: 'Add image', exact: true }).click();
  await author.page.getByLabel('Image file', { exact: true }).setInputFiles({
    name: 'synthetic.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64',
    ),
  });
  await author.page.getByLabel('Alt text', { exact: true }).fill('A synthetic staff-review pixel');
  await author.page.getByRole('button', { name: 'Insert image', exact: true }).click();
  await sync(author.page);
  await submitInEditor(author.page);
  await expect(author.page.getByLabel('Title', { exact: true })).toBeDisabled();
  const submitted = await current(author.session, created.id);
  expect(submitted.review.submittedRevisionId).toBe(submitted.workingRevisionId);
  await editor.page.goto('/studio/review');
  await expect(
    editor.page.getByRole('heading', { name: 'Review workspace', exact: true }),
  ).toBeVisible();
  await openReview(editor.page, created.id);
  await expect(
    editor.page.getByRole('region', { name: 'Submitted for review', exact: true }),
  ).toContainText(title);
  await expect(
    editor.page.getByRole('region', { name: 'Submitted for review', exact: true }),
  ).toContainText(submitted.workingRevisionId!);
  expect(submitted.workingRevision!.content.categoryId).toBe(vocabulary.category.id);
  expect(submitted.workingRevision!.content.tagIds).toContain(vocabulary.tags[0].id);
  const submittedSnapshot = editor.page.getByRole('region', {
    name: 'Submitted for review',
    exact: true,
  });
  await expect(
    submittedSnapshot.locator('dl').getByText(vocabulary.category.name, { exact: true }),
  ).toBeVisible();
  await expect(
    submittedSnapshot.locator('dl').getByText(vocabulary.tags[0].name, { exact: true }),
  ).toBeVisible();
  await editor.page.getByText('Read private formatted preview', { exact: true }).click();
  const privateImage = editor.page.getByRole('img', { name: 'A synthetic staff-review pixel' });
  await expect(privateImage).toBeVisible();
  expect(await privateImage.getAttribute('src')).toMatch(/^\/api\/editorial\/posts\//);
  const privateMedia = await editor.session.request.get((await privateImage.getAttribute('src'))!);
  expect(privateMedia.status()).toBe(200);
  expect(privateMedia.headers()['cache-control']).toContain('no-store');
  await publish(editor.page);
  const published = await current(editor.session, created.id);
  expect(published.publishedRevisionId).toBe(submitted.review.submittedRevisionId);
  const publicPage = await author.session.newPage();
  await publicPage.goto(`/posts/${published.slug}`);
  await expect(publicPage.getByRole('heading', { name: title, exact: true })).toBeVisible();
  const firstPublication = await publicPage.locator('time').first().getAttribute('datetime');
  const unpublished = `Private correction ${randomUUID()}`;
  await openEditor(author.page, created.id);
  await author.page.getByLabel('Title', { exact: true }).fill(unpublished);
  await sync(author.page);
  await publicPage.reload();
  await expect(publicPage.getByRole('heading', { name: title, exact: true })).toBeVisible();
  await expect(publicPage.getByText(unpublished, { exact: true })).toHaveCount(0);
  await submitInEditor(author.page);
  await openReview(editor.page, created.id);
  await expect(
    editor.page.getByRole('region', { name: 'Published snapshot', exact: true }),
  ).toContainText(title);
  await expect(
    editor.page.getByRole('region', { name: 'Submitted for review', exact: true }),
  ).toContainText(unpublished);
  await publish(editor.page);
  await publicPage.reload();
  await expect(publicPage.getByRole('heading', { name: unpublished, exact: true })).toBeVisible();
  expect(await publicPage.locator('time').first().getAttribute('datetime')).toBe(firstPublication);
});

test('rejection requires feedback and preserves the published revision; the author can revise, resubmit and withdraw review', async ({
  browser,
}) => {
  const base = control<WorkspacePost>('create-post', {
    published: true,
    content: { title: `Feedback article ${randomUUID()}` },
  });
  const changed = control<WorkspacePost>('advance-post', {
    postId: base.id,
    content: { markdown: 'A proposed correction needing feedback.' },
  });
  const author = await login(browser),
    editor = await login(browser, 'editor');
  await submit(author.session, changed);
  await openReview(editor.page, base.id);
  await expect(
    editor.page.getByRole('button', { name: 'Request changes', exact: true }),
  ).toBeDisabled();
  const feedback = `Please clarify the second paragraph. ${randomUUID()}`;
  await editor.page.getByLabel('Feedback for changes requested', { exact: true }).fill(feedback);
  await editor.page.getByRole('button', { name: 'Request changes', exact: true }).click();
  await editor.page.getByRole('button', { name: 'Confirm request changes', exact: true }).click();
  await expect(
    editor.page.getByText('No revision is currently submitted.', { exact: false }),
  ).toBeVisible();
  await expect(editor.page.locator('blockquote').filter({ hasText: feedback })).toBeVisible();
  const rejected = await current(author.session, base.id);
  expect(rejected.workflowState).toBe('CHANGES_REQUESTED');
  expect(rejected.publishedRevisionId).toBe(base.publishedRevisionId);
  await openEditor(author.page, base.id);
  await expect(
    author.page.getByRole('heading', { name: 'Review feedback', exact: true }),
  ).toBeVisible();
  await expect(author.page.getByText(feedback, { exact: true })).toBeVisible();
  await author.page.getByLabel('Markdown', { exact: true }).fill('A clarified correction.');
  await sync(author.page);
  await submitInEditor(author.page);
  await expect(author.page.getByLabel('Markdown', { exact: true })).toBeDisabled();
  await author.page.getByRole('button', { name: 'Withdraw from review', exact: true }).click();
  await expect(author.page.getByLabel('Markdown', { exact: true })).toBeEnabled();
  expect((await current(author.session, base.id)).workflowState).toBe('DRAFT');
});

test('a lost publication response retries identical input/version/key and records one publication event', async ({
  browser,
}) => {
  const base = control<WorkspacePost>('create-post', {
    content: { title: `Replay publication ${randomUUID()}` },
  });
  const editor = await login(browser, 'editor');
  await submit(editor.session, base);
  await openReview(editor.page, base.id);
  const attempts: { key?: string; version?: string; body: string | null }[] = [];
  await editor.page.route(`**/api/editorial/posts/${base.id}/publish`, async (route) => {
    const request = route.request(),
      headers = request.headers();
    attempts.push({
      key: headers['idempotency-key'],
      version: headers['x-expected-version'],
      body: request.postData(),
    });
    if (attempts.length === 2) {
      const rejectedHeaders = { ...headers };
      delete rejectedHeaders['x-csrf-token'];
      await route.continue({ headers: rejectedHeaders });
      return;
    }
    const response = await route.fetch();
    if (attempts.length === 1) {
      expect(response.status()).toBe(200);
      await route.abort('connectionreset');
    } else await route.fulfill({ response });
  });
  await editor.page.getByRole('button', { name: 'Review and publish', exact: true }).click();
  await editor.page
    .getByRole('button', { name: 'Confirm review and publish', exact: true })
    .click();
  await expect(
    editor.page.getByRole('button', { name: 'Retry the same review action', exact: true }),
  ).toBeVisible();
  expect((await current(editor.session, base.id)).publicationState).toBe('PUBLISHED');
  const securityFailure = editor.page.waitForResponse(
    (response) => response.url().endsWith(`/posts/${base.id}/publish`) && response.status() === 403,
  );
  await editor.page
    .getByRole('button', { name: 'Retry the same review action', exact: true })
    .click();
  await securityFailure;
  await expect(
    editor.page.getByRole('button', { name: 'Retry the same review action', exact: true }),
  ).toBeEnabled();
  await editor.page
    .getByRole('button', { name: 'Retry the same review action', exact: true })
    .click();
  await expect(
    editor.page.getByText('No revision is currently submitted.', { exact: false }),
  ).toBeVisible();
  expect(attempts).toHaveLength(3);
  expect(attempts[1]).toEqual(attempts[0]);
  expect(attempts[2]).toEqual(attempts[0]);
  const events = await editor.session.request.get(`/api/editorial/posts/${base.id}/review-events`);
  expect(
    (await events.json()).data.filter((event: { action: string }) => event.action === 'PUBLISHED'),
  ).toHaveLength(1);
});

test('a competing reviewer gets an explicit version conflict and must refresh before a new decision', async ({
  browser,
}) => {
  const base = control<WorkspacePost>('create-post', {
    content: { title: `Concurrent review ${randomUUID()}` },
  });
  const first = await login(browser, 'editor'),
    second = await login(browser, 'admin');
  await submit(first.session, base);
  await Promise.all([openReview(first.page, base.id), openReview(second.page, base.id)]);
  await first.page
    .getByLabel('Feedback for changes requested', { exact: true })
    .fill('Clarify the source before publication.');
  await first.page.getByRole('button', { name: 'Request changes', exact: true }).click();
  await first.page.getByRole('button', { name: 'Confirm request changes', exact: true }).click();
  await expect(
    first.page.getByText('No revision is currently submitted.', { exact: false }),
  ).toBeVisible();
  await second.page.getByRole('button', { name: 'Review and publish', exact: true }).click();
  const conflict = second.page.waitForResponse(
    (response) => response.url().endsWith(`/posts/${base.id}/publish`) && response.status() === 412,
  );
  await second.page
    .getByRole('button', { name: 'Confirm review and publish', exact: true })
    .click();
  await conflict;
  await expect(second.page.locator('.staff-error[role="alert"]')).toContainText('changed');
  await expect(
    second.page.getByRole('button', { name: 'Confirm review and publish', exact: true }),
  ).toBeDisabled();
  expect((await current(second.session, base.id)).publicationState).toBe('NEVER_PUBLISHED');
  await second.page.getByRole('button', { name: 'Refresh review', exact: true }).click();
  await expect(
    second.page.getByText('No revision is currently submitted.', { exact: false }),
  ).toBeVisible();
  await expect(
    second.page.getByRole('button', { name: 'Review and publish', exact: true }),
  ).toHaveCount(0);
});

test('immutable history restores a new working revision; unpublish, trash and restore never republish retained content', async ({
  browser,
}) => {
  const base = control<WorkspacePost>('create-post', {
    published: true,
    content: {
      title: `History article ${randomUUID()}`,
      markdown: 'Original immutable history text.',
    },
  });
  control('advance-post', {
    postId: base.id,
    content: { markdown: 'A later private working revision.' },
  });
  const editor = await login(browser, 'editor');
  await editor.page.goto(`/studio/posts/${base.id}/history`);
  await expect(
    editor.page.getByRole('heading', { name: 'Revision and review history', exact: true }),
  ).toBeVisible();
  await editor.page.getByRole('button', { name: /^Read revision 1:/ }).click();
  await expect(
    editor.page.getByRole('region', { name: 'Historical revision', exact: true }),
  ).toContainText('Original immutable history text.');
  await editor.page
    .getByRole('button', { name: 'Restore revision 1 to working draft', exact: true })
    .click();
  await editor.page
    .getByRole('button', { name: 'Confirm restore to working draft', exact: true })
    .click();
  await expect(
    editor.page.getByText('Action completed. The current server state is shown.', { exact: true }),
  ).toBeVisible();
  const restored = await current(editor.session, base.id);
  expect(restored.workingRevision!.number).toBe(3);
  expect(restored.workingRevision!.restoredFromRevisionId).toBe(base.workingRevisionId);
  expect(restored.publishedRevisionId).toBe(base.publishedRevisionId);
  expect(restored.workingRevision!.content.markdown).toBe('Original immutable history text.');
  await openEditor(editor.page, base.id);
  await editor.page.getByRole('button', { name: 'Unpublish article', exact: true }).click();
  await expect(
    editor.page.getByText('New public article and image requests will become unavailable.', {
      exact: false,
    }),
  ).toBeVisible();
  await editor.page.getByRole('button', { name: 'Confirm unpublish', exact: true }).click();
  await expect
    .poll(async () => (await current(editor.session, base.id)).publicationState)
    .toBe('WITHDRAWN');
  await expect(
    editor.page.getByRole('button', { name: 'Move to trash', exact: true }),
  ).toBeEnabled();
  expect((await editor.session.request.get(`/posts/${base.slug}`)).status()).toBe(404);
  await editor.page.getByRole('button', { name: 'Move to trash', exact: true }).click();
  await editor.page.getByRole('button', { name: 'Confirm move to trash', exact: true }).click();
  await expect.poll(async () => (await current(editor.session, base.id)).trashedAt).not.toBeNull();
  const trashed = await current(editor.session, base.id);
  expect(trashed.purgeAfter).not.toBeNull();
  await editor.page.goto('/studio/trash');
  const card = editor.page.locator('article').filter({ hasText: base.id });
  await expect(card).toContainText('Permanent purge');
  await expect(card.locator('time').last()).toContainText(/\(.+\)/);
  await card.getByRole('button', { name: 'Restore as draft', exact: true }).click();
  await editor.page.getByRole('button', { name: 'Confirm restore as draft', exact: true }).click();
  await expect(card).toHaveCount(0);
  const recovered = await current(editor.session, base.id);
  expect(recovered.trashedAt).toBeNull();
  expect(recovered.purgeAfter).toBeNull();
  expect(recovered.workflowState).toBe('DRAFT');
  expect(recovered.publicationState).toBe('WITHDRAWN');
  expect((await editor.session.request.get(`/posts/${base.slug}`)).status()).toBe(404);
});

test('slug confirmation previews the redirect and historical names remain reserved to their owning article', async ({
  browser,
}) => {
  const first = control<WorkspacePost>('create-post', {
    published: true,
    content: { title: `First address ${randomUUID()}` },
  });
  const second = control<WorkspacePost>('create-post', {
    published: true,
    content: { title: `Second address ${randomUUID()}` },
  });
  const editor = await login(browser, 'editor');
  const slug = `new-address-${randomUUID()}`;
  await openEditor(editor.page, first.id);
  await editor.page.getByRole('button', { name: 'Change public address', exact: true }).click();
  await editor.page.getByLabel('New article slug', { exact: true }).fill('Invalid Slug');
  await expect(
    editor.page.getByRole('button', { name: 'Confirm address change', exact: true }),
  ).toBeDisabled();
  await editor.page.getByLabel('New article slug', { exact: true }).fill(slug);
  await expect(
    editor.page.getByText(`Redirect preview: /posts/${first.slug} → /posts/${slug}`, {
      exact: true,
    }),
  ).toBeVisible();
  await editor.page.getByRole('button', { name: 'Confirm address change', exact: true }).click();
  await expect.poll(async () => (await current(editor.session, first.id)).slug).toBe(slug);
  const redirect = await editor.session.request.get(`/posts/${first.slug}`, { maxRedirects: 0 });
  expect(redirect.status()).toBe(308);
  expect(redirect.headers().location).toMatch(new RegExp(`/posts/${slug}$`));
  expect(redirect.headers()['cache-control']).toContain('no-store');
  await openEditor(editor.page, second.id);
  await editor.page.getByRole('button', { name: 'Change public address', exact: true }).click();
  await editor.page.getByLabel('New article slug', { exact: true }).fill(first.slug!);
  await editor.page.getByRole('button', { name: 'Confirm address change', exact: true }).click();
  await expect(
    editor.page.getByRole('alert').filter({ hasText: 'earlier redirect' }),
  ).toBeVisible();
  expect((await current(editor.session, second.id)).slug).toBe(second.slug);
  expect((await current(editor.session, first.id)).slug).toBe(slug);
  // A current canonical name is reserved just as a historical address is. There
  // is no separate forbidden-word list in the pinned API or backend policy.
  await openEditor(editor.page, second.id);
  await editor.page.getByRole('button', { name: 'Change public address', exact: true }).click();
  await editor.page.getByLabel('New article slug', { exact: true }).fill(slug);
  const collision = editor.page.waitForResponse(
    (response) => response.url().endsWith(`/posts/${second.id}/slug`) && response.status() === 409,
  );
  await editor.page.getByRole('button', { name: 'Confirm address change', exact: true }).click();
  expect((await (await collision).json()).error.code).toBe('SLUG_CONFLICT');
  await expect(editor.page.locator('.staff-error[role="alert"]')).toContainText(
    'already belongs to another article',
  );
  expect((await current(editor.session, second.id)).slug).toBe(second.slug);
  expect((await current(editor.session, first.id)).slug).toBe(slug);
});

test('an editor can publish their own exact submitted revision while all decision controls remain disabled during the held response', async ({
  browser,
}) => {
  const created = control<WorkspacePost>('create-post', {
    label: 'editor',
    content: { title: `Editor-owned publication ${randomUUID()}` },
  });
  const editor = await login(browser, 'editor');
  expect(created.author.id).toBe(editor.memberId);
  const submitted = await submit(editor.session, created);
  await openReview(editor.page, created.id);
  await editor.page
    .getByLabel('Feedback for changes requested', { exact: true })
    .fill('A review note that must remain locked while publication is pending.');
  await expect(
    editor.page.getByRole('button', { name: 'Request changes', exact: true }),
  ).toBeEnabled();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const attempts: { key?: string; version?: string; body: string | null }[] = [];
  let committed = false;
  const path = `**/api/editorial/posts/${created.id}/publish`;
  await editor.page.route(path, async (route) => {
    const headers = route.request().headers();
    attempts.push({
      key: headers['idempotency-key'],
      version: headers['x-expected-version'],
      body: route.request().postData(),
    });
    const response = await route.fetch();
    expect(response.status()).toBe(200);
    committed = true;
    await gate;
    await route.fulfill({ response });
  });
  try {
    await editor.page.getByRole('button', { name: 'Review and publish', exact: true }).click();
    await editor.page
      .getByRole('button', { name: 'Confirm review and publish', exact: true })
      .click();
    await expect.poll(() => committed, { timeout: 15_000 }).toBe(true);
    await expect(
      editor.page.getByRole('button', { name: 'Review and publish', exact: true }),
    ).toBeDisabled();
    await expect(
      editor.page.getByRole('button', { name: 'Request changes', exact: true }),
    ).toBeDisabled();
    await expect(
      editor.page.getByRole('button', { name: 'Refresh review', exact: true }),
    ).toBeDisabled();
    await expect(editor.page.getByRole('button', { name: 'Working…', exact: true })).toBeDisabled();
    await expect(
      editor.page.getByLabel('Feedback for changes requested', { exact: true }),
    ).toBeDisabled();
    expect(attempts).toHaveLength(1);
    expect(attempts[0].key).toMatch(/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/);
    expect(attempts[0].version).toBe(String(submitted.version));
    expect(JSON.parse(attempts[0].body!)).toEqual({
      revisionId: submitted.review.submittedRevisionId,
    });
    const authoritative = await current(editor.session, created.id);
    expect(authoritative.publishedRevisionId).toBe(submitted.review.submittedRevisionId);
    expect(authoritative.author.id).toBe(editor.memberId);
    release();
    await expect(
      editor.page.getByText('No revision is currently submitted.', { exact: false }),
    ).toBeVisible();
    expect(attempts).toHaveLength(1);
  } finally {
    release();
    await editor.page.unroute(path);
  }
});

test('the review queue traverses every authorized cursor page without losing or duplicating submitted revisions', async ({
  browser,
}) => {
  test.setTimeout(240_000);
  const template = control<WorkspacePost>('create-post', {
    label: 'editor',
    content: { title: `Review cursor base ${randomUUID()}` },
  });
  const editor = await login(browser, 'editor');
  const seeded: string[] = [template.id];
  await submit(editor.session, template);
  for (let index = 0; index < 20; index++) {
    const result = await staffMutation(editor.session, '/posts', {
      content: {
        clientDraftId: randomUUID(),
        draft: {
          ...template.workingRevision!.content,
          title: `Review cursor ${index} ${randomUUID()}`,
        },
      },
    });
    expect(result.response.status()).toBe(201);
    const post = result.body.data as WorkspacePost;
    seeded.push(post.id);
    await submit(editor.session, post);
  }
  const expected: WorkspacePostSummary[] = [];
  let cursor: string | null = null;
  const seenCursors = new Set<string>();
  do {
    const query = new URLSearchParams({ scope: 'ALL', workflowState: 'IN_REVIEW', pageSize: '20' });
    if (cursor) query.set('cursor', cursor);
    const response = await editor.session.request.get(`/api/editorial/posts?${query}`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.meta.pagination.kind).toBe('CURSOR');
    expected.push(...body.data);
    cursor = body.meta.pagination.nextCursor;
    expect(body.meta.pagination.hasMore).toBe(cursor !== null);
    if (cursor) {
      expect(seenCursors.has(cursor)).toBe(false);
      seenCursors.add(cursor);
    }
  } while (cursor);
  expect(expected.length).toBeGreaterThan(20);
  for (const id of seeded) expect(expected.some((post) => post.id === id)).toBe(true);
  await editor.page.goto('/studio/review');
  const queue = editor.page.getByRole('region', { name: 'Review workspace', exact: true });
  const links = queue.locator('a[href^="/studio/review/"]');
  await expect(links).toHaveCount(20);
  for (let loaded = 20; loaded < expected.length; loaded += 20) {
    await queue.getByRole('button', { name: 'Load more submissions', exact: true }).click();
    await expect(links).toHaveCount(Math.min(loaded + 20, expected.length));
  }
  expect(
    await links.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute('href')!.split('/').at(-1)),
    ),
  ).toEqual(expected.map((post) => post.id));
  await expect(
    queue.getByRole('button', { name: 'Load more submissions', exact: true }),
  ).toHaveCount(0);
});

test('immutable history retains exact snapshots and locks independent cursors throughout restore readback', async ({
  browser,
}) => {
  test.setTimeout(300_000);
  const created = control<WorkspacePost>('create-post', {
    label: 'editor',
    content: {
      title: `History cursor ${randomUUID()}`,
      markdown: 'Original cursor history remains immutable.',
    },
  });
  const editor = await login(browser, 'editor');
  let post = created;
  for (let number = 2; number <= 22; number++) {
    const saved = await staffMutation(editor.session, `/posts/${post.id}/draft`, {
      method: 'PUT',
      version: post.version,
      content: {
        ...post.workingRevision!.content,
        title: `Historical revision ${number} ${randomUUID()}`,
        markdown: `Immutable body for revision ${number}.`,
      },
    });
    expect(saved.response.status()).toBe(200);
    post = saved.body.data as WorkspacePost;
    if (number <= 12) {
      post = await submit(editor.session, post);
      const withdrawn = await staffMutation(editor.session, `/posts/${post.id}/withdraw-review`, {
        version: post.version,
        content: {},
      });
      expect(withdrawn.response.status()).toBe(200);
      post = withdrawn.body.data as WorkspacePost;
    }
  }
  const revisions = await cursorData<components['schemas']['RevisionSummary']>(
    editor.session,
    `/posts/${post.id}/revisions`,
  );
  const events = await cursorData<components['schemas']['ReviewEvent']>(
    editor.session,
    `/posts/${post.id}/review-events`,
  );
  expect(revisions).toHaveLength(22);
  expect(events).toHaveLength(22);
  // Fixture writes can fill the rolling quota again after the beforeEach reservation.
  await waitForStaffCapacity();
  await editor.page.goto(`/studio/posts/${post.id}/history`);
  const revisionButtons = editor.page.getByRole('button', { name: /^Read revision \d+:/ });
  const activity = editor.page
    .locator('section.staff-card')
    .filter({ has: editor.page.getByRole('heading', { name: 'Review activity', exact: true }) });
  await expect(revisionButtons).toHaveCount(20);
  await expect(activity.getByRole('listitem')).toHaveCount(20);
  await editor.page.getByRole('button', { name: 'Load older revisions', exact: true }).click();
  await expect(revisionButtons).toHaveCount(22);
  expect((await revisionButtons.allTextContents()).map((value) => value.trim())).toEqual(
    revisions.map(
      (revision) => `Read revision ${revision.number}: ${revision.title || 'Untitled'}`,
    ),
  );
  await editor.page
    .getByRole('button', { name: 'Load older review activity', exact: true })
    .click();
  await expect(activity.getByRole('listitem')).toHaveCount(22);
  expect(
    (await activity.locator('li code').allTextContents()).map((value) => value.trim()),
  ).toEqual(events.map((event) => event.revisionId));
  await expect(
    editor.page.getByRole('button', { name: 'Load older revisions', exact: true }),
  ).toHaveCount(0);
  await expect(
    editor.page.getByRole('button', { name: 'Load older review activity', exact: true }),
  ).toHaveCount(0);
  await editor.page.getByRole('button', { name: /^Read revision 1:/ }).click();
  const snapshot = editor.page.getByRole('region', { name: 'Historical revision', exact: true });
  await expect(snapshot).toContainText(created.workingRevisionId!);
  await expect(snapshot).toContainText(created.workingRevision!.content.markdown);
  const unchanged = await current(editor.session, post.id);
  expect(unchanged.version).toBe(post.version);
  expect(unchanged.workingRevisionId).toBe(post.workingRevisionId);

  // Rebuild the first pages so both older cursors are available during the
  // restore's authoritative readback. No older page may race its replacement.
  await editor.page.getByRole('button', { name: 'Refresh history', exact: true }).click();
  await expect(revisionButtons).toHaveCount(20);
  await expect(activity.getByRole('listitem')).toHaveCount(20);
  const olderRevisions = editor.page.getByRole('button', {
    name: 'Load older revisions',
    exact: true,
  });
  const olderActivity = editor.page.getByRole('button', {
    name: 'Load older review activity',
    exact: true,
  });
  await expect(olderRevisions).toBeEnabled();
  await expect(olderActivity).toBeEnabled();
  const target = revisions.find((revision) => revision.number === 3)!;
  await editor.page.getByRole('button', { name: /^Read revision 3:/ }).click();
  await expect(snapshot).toContainText(target.id);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const readbacks: WorkspacePost[] = [];
  const readbackPath = `**/api/editorial/posts/${post.id}`;
  await editor.page.route(readbackPath, async (route) => {
    expect(route.request().method()).toBe('GET');
    const response = await route.fetch();
    expect(response.status()).toBe(200);
    readbacks.push((await response.json()).data as WorkspacePost);
    await gate;
    await route.fulfill({ response });
  });
  try {
    const mutation = editor.page.waitForRequest(
      (request) =>
        request.method() === 'POST' && request.url().endsWith(`/posts/${post.id}/restore-revision`),
    );
    const restored = editor.page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().endsWith(`/posts/${post.id}/restore-revision`),
    );
    await editor.page
      .getByRole('button', { name: 'Restore revision 3 to working draft', exact: true })
      .click();
    await editor.page
      .getByRole('button', { name: 'Confirm restore to working draft', exact: true })
      .click();
    const request = await mutation;
    expect(request.headers()['idempotency-key']).toMatch(
      /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/,
    );
    expect(request.headers()['x-expected-version']).toBe(String(post.version));
    expect(request.postDataJSON()).toEqual({ revisionId: target.id });
    expect((await restored).status()).toBe(200);
    await expect.poll(() => readbacks.length).toBe(1);
    expect(readbacks[0].version).toBe(post.version + 1);
    expect(readbacks[0].workingRevision?.restoredFromRevisionId).toBe(target.id);
    await expect(olderRevisions).toBeDisabled();
    await expect(olderActivity).toBeDisabled();
    await expect(
      editor.page.getByRole('button', { name: 'Refresh history', exact: true }),
    ).toBeDisabled();
    await expect(revisionButtons).toHaveCount(20);
    await expect(activity.getByRole('listitem')).toHaveCount(20);
    release();
    await expect(
      editor.page.getByText('Action completed. The current server state is shown.', {
        exact: true,
      }),
    ).toBeVisible();
    await expect(olderRevisions).toBeEnabled();
    await expect(olderActivity).toBeEnabled();
  } finally {
    release();
    await editor.page.unroute(readbackPath);
  }
  const restoredRevisions = await cursorData<components['schemas']['RevisionSummary']>(
    editor.session,
    `/posts/${post.id}/revisions`,
  );
  const restoredEvents = await cursorData<components['schemas']['ReviewEvent']>(
    editor.session,
    `/posts/${post.id}/review-events`,
  );
  expect(restoredRevisions).toHaveLength(23);
  expect(restoredEvents).toEqual(events);
  await olderRevisions.click();
  await expect(revisionButtons).toHaveCount(23);
  expect((await revisionButtons.allTextContents()).map((value) => value.trim())).toEqual(
    restoredRevisions.map(
      (revision) => `Read revision ${revision.number}: ${revision.title || 'Untitled'}`,
    ),
  );
  await olderActivity.click();
  await expect(activity.getByRole('listitem')).toHaveCount(22);
  expect(
    (await activity.locator('li code').allTextContents()).map((value) => value.trim()),
  ).toEqual(restoredEvents.map((event) => event.revisionId));
  await expect(olderRevisions).toHaveCount(0);
  await expect(olderActivity).toHaveCount(0);
});

test('author role cannot review or list other staff work and can recover its own never-published trash', async ({
  browser,
}) => {
  const foreign = control<WorkspacePost>('create-post', {
    label: 'other',
    content: { title: `Foreign private title ${randomUUID()}` },
  });
  const own = control<WorkspacePost>('create-post', {
    content: { title: `Own recovery ${randomUUID()}` },
  });
  const author = await login(browser);
  await author.page.goto(`/studio/review/${foreign.id}`);
  await expect(
    author.page.getByRole('heading', {
      name: 'This area is not available for your role.',
      exact: true,
    }),
  ).toBeVisible();
  expect(await author.page.content()).not.toContain(foreign.workingRevision!.content.title);
  expect((await author.session.request.get('/api/editorial/posts?scope=ALL')).status()).toBe(403);
  expect(
    (await author.session.request.get(`/api/editorial/posts/${foreign.id}/revisions`)).status(),
  ).toBe(404);
  await openEditor(author.page, own.id);
  await author.page.getByRole('button', { name: 'Move to trash', exact: true }).click();
  const reloaded = author.page.waitForEvent('load');
  await author.page.getByRole('button', { name: 'Confirm move to trash', exact: true }).click();
  await reloaded;
  await expect.poll(async () => (await current(author.session, own.id)).trashedAt).not.toBeNull();
  await author.page.goto('/studio/trash');
  const card = author.page.locator('article').filter({ hasText: own.id });
  await card.getByRole('button', { name: 'Restore as draft', exact: true }).click();
  await author.page.getByRole('button', { name: 'Confirm restore as draft', exact: true }).click();
  await expect(card).toHaveCount(0);
  expect((await current(author.session, own.id)).publicationState).toBe('NEVER_PUBLISHED');
});

test('review decisions and history support keyboard confirmation, phone reflow and both themes', async ({
  browser,
}) => {
  const base = control<WorkspacePost>('create-post', {
    content: {
      title: `Accessible review ${randomUUID()}`,
      markdown:
        '# Heading from source\n\n### Deep source heading\n\n```text\naccessible code\n```\n\n| First | Second |\n| --- | --- |\n| Value | Value |',
    },
  });
  const editor = await login(browser, 'editor');
  await submit(editor.session, base);
  await openReview(editor.page, base.id);
  const trigger = editor.page.getByRole('button', { name: 'Review and publish', exact: true });
  await trigger.focus();
  await editor.page.keyboard.press('Enter');
  await expect(
    editor.page.getByRole('heading', { name: /^Publish revision \d+\?$/ }),
  ).toBeFocused();
  await editor.page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(trigger).toBeFocused();
  await editor.page.getByText('Read private formatted preview', { exact: true }).click();
  await expect(editor.page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(editor.page.getByRole('button', { name: 'Copy code', exact: true })).toBeVisible();
  for (const width of [1440, 390])
    for (const theme of ['light', 'dark'] as const) {
      await editor.page.setViewportSize({ width, height: 900 });
      await editor.page.evaluate((value) => {
        document.documentElement.dataset.theme = value;
        document.documentElement.style.colorScheme = value;
      }, theme);
      expect(
        await editor.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      const results = await new AxeBuilder({ page: editor.page }).analyze();
      expect(results.violations).toEqual([]);
    }
  await editor.page.goto(`/studio/posts/${base.id}/history`);
  await expect(editor.page.getByRole('button', { name: /^Read revision 1:/ })).toBeVisible();
  await editor.page.getByRole('button', { name: /^Read revision 1:/ }).click();
  await expect(
    editor.page.getByRole('region', { name: 'Historical revision', exact: true }),
  ).toBeVisible();
  await editor.page.getByText('Read private formatted preview', { exact: true }).click();
  expect(
    await editor.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
  expect((await new AxeBuilder({ page: editor.page }).analyze()).violations).toEqual([]);
});

test('an uncertain publication older than the replay window requires inspection and never sends another mutation', async ({
  browser,
}) => {
  const base = control<WorkspacePost>('create-post', {
    content: { title: `Expired publication replay ${randomUUID()}` },
  });
  const editor = await login(browser, 'editor');
  await submit(editor.session, base);
  await editor.page.clock.install({ time: new Date() });
  await openReview(editor.page, base.id);
  let attempts = 0;
  await editor.page.route(`**/api/editorial/posts/${base.id}/publish`, async (route) => {
    attempts++;
    expect((await route.fetch()).status()).toBe(200);
    await route.abort('connectionreset');
  });
  await editor.page.getByRole('button', { name: 'Review and publish', exact: true }).click();
  await editor.page
    .getByRole('button', { name: 'Confirm review and publish', exact: true })
    .click();
  await expect(
    editor.page.getByRole('button', { name: 'Retry the same review action', exact: true }),
  ).toBeVisible();
  await editor.page.clock.fastForward(86_400_001);
  await editor.page
    .getByRole('button', { name: 'Retry the same review action', exact: true })
    .click();
  await expect(
    editor.page.getByText('The safe retry window ended.', { exact: false }),
  ).toBeVisible();
  expect(attempts).toBe(1);
  await editor.page.getByRole('button', { name: 'Refresh review', exact: true }).click();
  await expect(
    editor.page.getByText('No revision is currently submitted.', { exact: false }),
  ).toBeVisible();
  expect(attempts).toBe(1);
});
