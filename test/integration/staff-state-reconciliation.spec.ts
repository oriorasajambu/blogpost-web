import { randomUUID } from 'node:crypto';
import type { BrowserContext } from '@playwright/test';
import type { WorkspacePost } from '../../src/features/editor/editor-contract';
import type { StaffMember } from '../../src/lib/auth-contract';
import { test, expect, login, control, staffMutation } from './staff-test-helpers';

async function me(session: BrowserContext): Promise<StaffMember> {
  const response = await session.request.get('/api/editorial/me');
  expect(response.status()).toBe(200);
  return (await response.json()).data;
}
async function post(session: BrowserContext, id: string): Promise<WorkspacePost> {
  const response = await session.request.get(`/api/editorial/posts/${id}`);
  expect(response.status()).toBe(200);
  return (await response.json()).data;
}

test('successful profile readback locks manual refresh and preserves a single current comparison', async ({
  browser,
}) => {
  const author = await login(browser);
  const initial = await me(author.session);
  let holdNextRead = false;
  let held = false;
  let reads = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let failed = false;
  try {
    await author.page.goto('/studio/profile');
    await author.page.route('**/api/editorial/me', async (route) => {
      if (route.request().method() === 'PATCH') {
        const actual = await route.fetch();
        expect(actual.status()).toBe(200);
        holdNextRead = true;
        await route.fulfill({ response: actual });
      } else if (holdNextRead) {
        holdNextRead = false;
        reads++;
        const actual = await route.fetch();
        held = true;
        await gate;
        await route.fulfill({ response: actual });
      } else await route.continue();
    });
    const proposal = `Readback profile ${randomUUID()}`;
    await author.page.getByLabel('Display name', { exact: true }).fill(proposal);
    await author.page.getByRole('button', { name: 'Save public profile', exact: true }).click();
    await expect.poll(() => held).toBe(true);
    const refresh = author.page.getByRole('button', { name: 'Load latest profile', exact: true });
    await expect(refresh).toBeDisabled();
    await expect(
      author.page.getByRole('button', { name: 'Save public profile', exact: true }),
    ).toBeDisabled();
    await refresh.evaluate((button: HTMLButtonElement) => button.click());
    expect(reads).toBe(1);
    release();
    await expect(
      author.page.getByRole('status').filter({ hasText: 'Your public profile was saved.' }),
    ).toBeVisible();
    await expect(refresh).toBeEnabled();
    await author.page.getByText('Current server profile for comparison', { exact: true }).click();
    const comparison = author.page.locator('details').filter({
      has: author.page.getByText('Current server profile for comparison', { exact: true }),
    });
    await expect(comparison).toContainText(proposal);
    expect((await me(author.session)).version).toBe(initial.version + 1);
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    release();
    await author.page.unroute('**/api/editorial/me');
    try {
      const current = await me(author.session);
      const restored = await staffMutation(author.session, '/me', {
        method: 'PATCH',
        version: current.version,
        content: { displayName: initial.displayName, bio: initial.bio },
      });
      expect(restored.response.status()).toBe(200);
    } catch (error) {
      if (!failed) throw error;
    }
  }
});

test('publication readback displays a newly resubmitted exact revision instead of claiming the queue is empty', async ({
  browser,
}) => {
  const created = control<WorkspacePost>('create-post', {
    content: { title: `First submission ${randomUUID()}` },
  });
  const author = await login(browser);
  const editor = await login(browser, 'editor');
  const submitted = await staffMutation(author.session, `/posts/${created.id}/submit`, {
    version: created.version,
    content: { revisionId: created.workingRevisionId },
  });
  expect(submitted.response.status()).toBe(200);
  await editor.page.goto(`/studio/review/${created.id}`);
  await expect(
    editor.page.getByRole('button', { name: 'Review and publish', exact: true }),
  ).toBeEnabled();
  const title = `Next submission ${randomUUID()}`;
  let resubmitted: WorkspacePost | null = null;
  let advanced = false;
  await editor.page.route(`**/api/editorial/posts/${created.id}`, async (route) => {
    if (route.request().method() !== 'GET' || advanced) {
      await route.continue();
      return;
    }
    advanced = true;
    const published = await post(author.session, created.id);
    expect(published.publicationState).toBe('PUBLISHED');
    const saved = await staffMutation(author.session, `/posts/${created.id}/draft`, {
      method: 'PUT',
      version: published.version,
      content: { ...published.workingRevision!.content, title },
    });
    expect(saved.response.status()).toBe(200);
    const next = saved.body.data as WorkspacePost;
    const review = await staffMutation(author.session, `/posts/${created.id}/submit`, {
      version: next.version,
      content: { revisionId: next.workingRevisionId },
    });
    expect(review.response.status()).toBe(200);
    resubmitted = review.body.data;
    await route.fulfill({ response: await route.fetch() });
  });
  try {
    await editor.page.getByRole('button', { name: 'Review and publish', exact: true }).click();
    await editor.page
      .getByRole('button', { name: 'Confirm review and publish', exact: true })
      .click();
    const comparison = editor.page.getByRole('region', {
      name: 'Submitted for review',
      exact: true,
    });
    await expect(comparison).toContainText(title);
    expect(resubmitted).not.toBeNull();
    await expect(comparison).toContainText(
      (resubmitted as unknown as WorkspacePost).review.submittedRevisionId!,
    );
    await expect(
      editor.page.getByRole('button', { name: 'Review and publish', exact: true }),
    ).toBeEnabled();
    await expect(
      editor.page.getByText('No revision is currently submitted.', { exact: false }),
    ).toHaveCount(0);
    await expect(
      editor.page.getByRole('region', { name: 'Published snapshot', exact: true }),
    ).toContainText(created.workingRevision!.content.title);
    const actual = await post(editor.session, created.id);
    expect(actual.publishedRevisionId).toBe(created.workingRevisionId);
    expect(actual.review.submittedRevisionId).not.toBe(actual.publishedRevisionId);
  } finally {
    await editor.page.unroute(`**/api/editorial/posts/${created.id}`);
  }
});

test('an administrator changing their own role receives a fresh authorized workspace and navigation', async ({
  browser,
}) => {
  const admin = await login(browser, 'admin');
  const other = await login(browser, 'other');
  const initial = await me(admin.session);
  const otherInitial = await me(other.session);
  let failed = false;
  try {
    const promoted = await staffMutation(admin.session, `/admin/members/${otherInitial.id}`, {
      method: 'PATCH',
      version: otherInitial.version,
      content: { role: 'ADMIN', active: true },
    });
    expect(promoted.response.status()).toBe(200);
    await admin.page.goto('/studio/admin');
    const members = admin.page.getByRole('region', { name: 'Staff members', exact: true });
    const row = members
      .getByRole('listitem')
      .filter({ has: admin.page.getByText(initial.email, { exact: true }) });
    await row.getByRole('button', { name: `Manage ${initial.displayName}`, exact: true }).click();
    const editor = members.getByRole('region', {
      name: `Manage ${initial.displayName}`,
      exact: true,
    });
    await editor.getByRole('combobox', { name: 'Role', exact: true }).selectOption('AUTHOR');
    await editor.getByRole('button', { name: 'Review access change', exact: true }).click();
    await editor.getByRole('button', { name: 'Change staff access', exact: true }).click();
    await expect(
      admin.page.getByRole('heading', { name: 'Your staff workspace', exact: true }),
    ).toBeVisible();
    await expect(
      admin.page.getByRole('heading', { name: 'Staff access is unavailable.', exact: true }),
    ).toHaveCount(0);
    const navigation = admin.page.getByRole('navigation', {
      name: 'Staff navigation',
      exact: true,
    });
    await expect(navigation.getByRole('link', { name: 'Staff access', exact: true })).toHaveCount(
      0,
    );
    await expect(navigation.getByRole('link', { name: 'Review', exact: true })).toHaveCount(0);
    expect((await me(admin.session)).role).toBe('AUTHOR');
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    try {
      const current = await me(admin.session);
      if (current.role !== initial.role) {
        const restored = await staffMutation(other.session, `/admin/members/${initial.id}`, {
          method: 'PATCH',
          version: current.version,
          content: { role: initial.role, active: initial.active },
        });
        expect(restored.response.status()).toBe(200);
      }
      const target = await me(other.session);
      if (target.role !== otherInitial.role || target.active !== otherInitial.active) {
        const restored = await staffMutation(admin.session, `/admin/members/${target.id}`, {
          method: 'PATCH',
          version: target.version,
          content: { role: otherInitial.role, active: otherInitial.active },
        });
        expect(restored.response.status()).toBe(200);
      }
    } catch (error) {
      if (!failed) throw error;
    }
  }
});
