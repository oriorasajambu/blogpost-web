import { randomUUID } from 'node:crypto';
import { test, expect, login, control, staffMutation, stack } from './staff-test-helpers';
import type { WorkspacePost } from '../../src/features/editor/editor-contract';

test('staff pages and data enforce anonymous and author role boundaries without draft serialization', async ({
  browser,
  request,
}) => {
  const post = control<WorkspacePost>('create-post', {
    content: {
      title: `Private boundary ${randomUUID()}`,
      markdown: 'Private staff body for boundary checks.',
    },
  });
  for (const path of [
    '/studio/review',
    `/studio/review/${post.id}`,
    `/studio/posts/${post.id}/history`,
    '/studio/trash',
    '/studio/admin',
    '/studio/taxonomy',
  ]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect([307, 308]).toContain(response.status());
    expect(response.headers().location).toContain('/sign-in');
    expect(await response.text()).not.toContain(post.workingRevision!.content.title);
  }
  const author = await login(browser);
  for (const path of ['/studio/review', '/studio/admin', '/studio/taxonomy']) {
    await author.page.goto(path);
    await expect(
      author.page.getByRole('heading', { name: 'This area is not available for your role.' }),
    ).toBeVisible();
    expect(await author.page.content()).not.toContain(post.workingRevision!.content.title);
  }
  for (const path of ['/posts?scope=ALL', '/admin/members', '/categories']) {
    const response = await author.session.request.get(`/api/editorial${path}`);
    expect(response.status()).toBe(403);
    expect(await response.text()).not.toContain(post.workingRevision!.content.title);
  }
  const foreign = await login(browser, 'other');
  await foreign.page.goto(`/studio/posts/${post.id}/history`);
  await expect(foreign.page.locator('.staff-error[role="alert"]')).toBeVisible();
  expect(await foreign.page.content()).not.toContain(post.workingRevision!.content.title);
});

test('editor all-article filters use durable URLs while author pages stay scoped to own work', async ({
  browser,
}) => {
  const post = control<WorkspacePost>('create-post', {
    label: 'other',
    published: true,
    content: { title: `Filter article ${randomUUID()}` },
  });
  const editor = await login(browser, 'editor');
  await editor.page.goto('/studio/posts');
  await editor.page.getByRole('combobox', { name: 'Ownership', exact: true }).selectOption('ALL');
  await editor.page
    .getByRole('combobox', { name: 'Publication', exact: true })
    .selectOption('PUBLISHED');
  await editor.page.getByRole('combobox', { name: 'Workflow', exact: true }).selectOption('CLEAN');
  await editor.page.getByRole('button', { name: 'Apply filters', exact: true }).click();
  await expect(editor.page).toHaveURL(/scope=ALL&publicationState=PUBLISHED&workflowState=CLEAN/);
  const listing = editor.page.getByRole('region', { name: 'Browse staff articles' });
  await expect(listing.getByRole('link', { name: post.slug!, exact: true })).toBeVisible();
  await expect(listing).toContainText('Working revision:');
  await expect(listing).toContainText('Published revision:');
  await editor.page.reload();
  await expect(editor.page.getByRole('combobox', { name: 'Ownership', exact: true })).toHaveValue(
    'ALL',
  );
  const author = await login(browser);
  await author.page.goto('/studio/posts?scope=ALL');
  await expect(
    author.page.getByRole('heading', { name: 'Your staff workspace', exact: true }),
  ).toBeVisible();
  await expect(author.page.getByRole('combobox', { name: 'Ownership', exact: true })).toHaveCount(
    0,
  );
  await expect(author.page.getByRole('link', { name: post.slug!, exact: true })).toHaveCount(0);
});

test('staff proxy rejects missing CSRF and stale versions while preserving backend error diagnostics', async ({
  browser,
}) => {
  const admin = await login(browser, 'admin');
  const meResponse = await admin.session.request.get('/api/editorial/me');
  const me = (await meResponse.json()).data;
  const rejected = await admin.session.request.patch('/api/editorial/me', {
    headers: {
      Origin: stack.webOrigin,
      'content-type': 'application/json',
      'Idempotency-Key': randomUUID(),
      'X-Expected-Version': String(me.version),
    },
    data: { displayName: 'CSRF must not change this', bio: me.bio },
  });
  expect(rejected.status()).toBe(403);
  expect((await rejected.json()).error.code).toBe('CSRF_VALIDATION_FAILED');
  const stale = await staffMutation(admin.session, '/me', {
    method: 'PATCH',
    version: me.version + 100,
    content: { displayName: 'Must not overwrite', bio: me.bio },
  });
  expect(stale.response.status()).toBe(412);
  expect(stale.body.error.code).toBe('VERSION_CONFLICT');
  expect(stale.response.headers()['x-trace-id']).toBe(stale.body.traceId);
  expect(stale.response.headers()['cache-control']).toContain('no-store');
  const current = await admin.session.request.get('/api/editorial/me');
  expect((await current.json()).data).toEqual(me);
});
test('confirmed denial during review or history configuration hides already loaded private snapshots', async ({
  browser,
}) => {
  const post = control<WorkspacePost>('create-post', {
    content: {
      title: `Configuration boundary ${randomUUID()}`,
      markdown: 'Private comparison awaiting a fresh configuration check.',
    },
  });
  const editor = await login(browser, 'editor');
  for (const path of [`/studio/review/${post.id}`, `/studio/posts/${post.id}/history`]) {
    let checked = false;
    await editor.page.route('**/api/editor-config', async (route) => {
      checked = true;
      control('disable', 'editor');
      const response = await route.fetch();
      expect(response.status()).toBe(403);
      await route.fulfill({ response });
    });
    try {
      await editor.page.goto(path);
      await expect(
        editor.page.getByRole('heading', { name: 'Staff access is unavailable.', exact: true }),
      ).toBeVisible();
      expect(checked).toBe(true);
      await expect(
        editor.page.getByRole('heading', {
          name: post.workingRevision!.content.title,
          exact: true,
        }),
      ).toHaveCount(0);
      await expect(
        editor.page.getByRole('button', { name: 'Refresh review', exact: true }),
      ).toHaveCount(0);
      await expect(
        editor.page.getByRole('button', { name: 'Refresh history', exact: true }),
      ).toHaveCount(0);
    } finally {
      control('enable', 'editor');
      await editor.page.unroute('**/api/editor-config');
    }
  }
});

test('direct bearer transport and the web share exact revisions without claiming a native Android journey', async ({
  browser,
  request,
}) => {
  const category = control<{ category: { id: string } }>('prepare').category;
  const credential = control<{ idToken: string }>('token', 'author');
  const metadata = {
    'X-Device-ID': randomUUID(),
    'X-Device-OS': 'ANDROID',
    'X-Device-Version': 'unknown',
    'X-App-Version': '0.0.0+transport.compatibility',
    'X-App-Language': 'en',
  };
  const direct = await request.post(`${stack.backendOrigin}/v1/posts`, {
    headers: {
      Authorization: `Bearer ${credential.idToken}`,
      'Idempotency-Key': randomUUID(),
      ...metadata,
    },
    data: {
      clientDraftId: randomUUID(),
      draft: {
        title: `Transport interchange ${randomUUID()}`,
        summary: 'Synthetic staff transport compatibility.',
        markdown: 'Authored through the token transport.',
        categoryId: category.id,
        tagIds: [],
        coverMediaId: null,
        markdownContractVersion: 1,
        coverAltText: null,
        coverDecorative: false,
      },
    },
  });
  expect(direct.status()).toBe(201);
  let post = (await direct.json()).data as WorkspacePost;
  const author = await login(browser);
  await author.page.goto(`/studio/posts/${post.id}`);
  await expect(author.page.getByLabel('Title', { exact: true })).toHaveValue(
    post.workingRevision!.content.title,
  );
  await author.page.getByRole('button', { name: 'Submit for review', exact: true }).click();
  await expect(
    author.page.getByRole('button', { name: 'Withdraw from review', exact: true }),
  ).toBeVisible();
  const editor = await login(browser, 'editor');
  await editor.page.goto(`/studio/review/${post.id}`);
  await editor.page.getByRole('button', { name: 'Review and publish', exact: true }).click();
  await editor.page
    .getByRole('button', { name: 'Confirm review and publish', exact: true })
    .click();
  await expect(
    editor.page.getByText('Action completed. The current server state is shown.', { exact: true }),
  ).toBeVisible();
  const current = await editor.session.request.get(`/api/editorial/posts/${post.id}`);
  post = (await current.json()).data;
  const publicPost = await request.get(`${stack.backendOrigin}/v1/public/posts/${post.id}`, {
    headers: metadata,
  });
  expect(publicPost.status()).toBe(200);
  expect((await publicPost.json()).data.publishedRevisionId).toBe(post.workingRevisionId);
  await editor.page.goto(`/studio/posts/${post.id}`);
  await editor.page.getByRole('button', { name: 'Unpublish article', exact: true }).click();
  await editor.page.getByRole('button', { name: 'Confirm unpublish', exact: true }).click();
  await expect(
    editor.page.getByRole('button', { name: 'Unpublish article', exact: true }),
  ).toHaveCount(0);
  const withdrawn = await request.get(`${stack.backendOrigin}/v1/public/posts/${post.id}`, {
    headers: metadata,
  });
  expect(withdrawn.status()).toBe(404);
});
