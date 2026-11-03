import { randomUUID } from 'node:crypto';
import type { BrowserContext, Locator, Page, Route } from '@playwright/test';
import type { StaffMember } from '../../src/lib/auth-contract';
import type { WorkspacePost } from '../../src/features/editor/editor-contract';
import { test, expect, login, control, staffMutation, stack } from './staff-test-helpers';

async function currentPost(session: BrowserContext, id: string): Promise<WorkspacePost> {
  const response = await session.request.get(`/api/editorial/posts/${id}`);
  expect(response.status()).toBe(200);
  return (await response.json()).data;
}
async function currentMember(session: BrowserContext, id?: string): Promise<StaffMember> {
  const response = await session.request.get(
    id ? `/api/editorial/admin/members/${id}` : '/api/editorial/me',
  );
  expect(response.status()).toBe(200);
  return (await response.json()).data;
}
async function openReassignment(page: Page) {
  await page.goto('/studio/admin');
  const panel = page.getByRole('region', { name: 'Author reassignment', exact: true });
  await expect(
    panel.getByRole('button', { name: 'Refresh article choices', exact: true }),
  ).toBeEnabled();
  return panel;
}
async function chooseTarget(page: Page, panel: Locator, member: StaffMember) {
  for (let attempt = 0; attempt < 30; attempt++) {
    const item = panel.getByRole('listitem').filter({
      has: page.getByText(`${member.email} · ${member.role.toLowerCase()}`, { exact: true }),
    });
    if (await item.count()) {
      await item
        .getByRole('button', { name: `Choose author ${member.displayName}`, exact: true })
        .click();
      return;
    }
    const next = panel.getByRole('button', { name: 'Next author choices', exact: true });
    await expect(next).toBeVisible();
    await next.click();
    await expect(
      panel.getByRole('button', { name: 'Refresh author choices', exact: true }),
    ).toBeEnabled();
  }
  throw new Error('The requested active author was not found in the bounded cursor traversal.');
}
function gate() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

test('successful author reassignment keeps its article locked until the exact authorized readback completes', async ({
  browser,
}) => {
  const first = control<WorkspacePost>('create-post', {
    published: true,
    content: { title: `Held reassignment A ${randomUUID()}` },
  });
  const second = control<WorkspacePost>('create-post', {
    published: true,
    content: { title: `Held reassignment B ${randomUUID()}` },
  });
  const admin = await login(browser, 'admin');
  const target = await currentMember(admin.session, stack.fixture.accounts.other.memberId);
  const panel = await openReassignment(admin.page);
  const chooseFirst = panel.getByRole('button', {
    name: `Choose article ${first.slug}`,
    exact: true,
  });
  const chooseSecond = panel.getByRole('button', {
    name: `Choose article ${second.slug}`,
    exact: true,
  });
  await chooseFirst.click();
  await expect(
    panel.getByRole('heading', {
      name: `Selected article: ${first.workingRevision!.content.title}`,
      exact: true,
    }),
  ).toBeVisible();
  await chooseTarget(admin.page, panel, target);
  const responseGate = gate();
  let readbackSeen = false;
  const path = `**/api/editorial/posts/${first.id}`;
  const attempts: { path: string; body: string | null }[] = [];
  admin.page.on('request', (request) => {
    if (request.method() === 'PATCH' && new URL(request.url()).pathname.endsWith('/author'))
      attempts.push({ path: new URL(request.url()).pathname, body: request.postData() });
  });
  await admin.page.route(path, async (route) => {
    const response = await route.fetch();
    expect(response.status()).toBe(200);
    readbackSeen = true;
    await responseGate.promise;
    await route.fulfill({ response });
  });
  try {
    await panel.getByRole('button', { name: 'Review author reassignment', exact: true }).click();
    await panel.getByRole('button', { name: 'Reassign author', exact: true }).click();
    await expect.poll(() => readbackSeen).toBe(true);
    await expect(chooseSecond).toBeDisabled();
    await expect(
      panel.getByRole('button', { name: 'Refresh article choices', exact: true }),
    ).toBeDisabled();
    await expect(
      panel.getByRole('button', { name: 'Refresh author choices', exact: true }),
    ).toBeDisabled();
    await chooseSecond.click({ force: true });
    await expect(
      panel.getByRole('heading', {
        name: `Selected article: ${first.workingRevision!.content.title}`,
        exact: true,
      }),
    ).toBeVisible();
    expect(attempts).toEqual([
      {
        path: `/api/editorial/admin/posts/${first.id}/author`,
        body: JSON.stringify({ authorId: target.id }),
      },
    ]);
    responseGate.release();
    await expect(
      panel.getByRole('status').filter({ hasText: 'Author reassignment completed.' }),
    ).toBeVisible();
    await expect(chooseSecond).toBeEnabled();
    await chooseSecond.click();
    await expect(
      panel.getByRole('heading', {
        name: `Selected article: ${second.workingRevision!.content.title}`,
        exact: true,
      }),
    ).toBeVisible();
    expect((await currentPost(admin.session, first.id)).author.id).toBe(target.id);
    expect((await currentPost(admin.session, second.id)).author.id).toBe(second.author.id);
    expect(attempts).toHaveLength(1);
  } finally {
    responseGate.release();
    await admin.page.unroute(path);
  }
});

test('a failed author reassignment readback requires explicit ownership refresh before another mutation', async ({
  browser,
}) => {
  const first = control<WorkspacePost>('create-post', {
    published: true,
    content: { title: `Readback recovery A ${randomUUID()}` },
  });
  const second = control<WorkspacePost>('create-post', {
    published: true,
    content: { title: `Readback recovery B ${randomUUID()}` },
  });
  const admin = await login(browser, 'admin');
  const target = await currentMember(admin.session, stack.fixture.accounts.other.memberId);
  const panel = await openReassignment(admin.page);
  await panel.getByRole('button', { name: `Choose article ${first.slug}`, exact: true }).click();
  await chooseTarget(admin.page, panel, target);
  let dropped = false;
  const path = `**/api/editorial/posts/${first.id}`;
  const loseReadback = async (route: Route) => {
    if (dropped) {
      await route.continue();
      return;
    }
    dropped = true;
    expect((await route.fetch()).status()).toBe(200);
    await route.abort('connectionreset');
  };
  await admin.page.route(path, loseReadback);
  try {
    await panel.getByRole('button', { name: 'Review author reassignment', exact: true }).click();
    await panel.getByRole('button', { name: 'Reassign author', exact: true }).click();
    await expect(
      panel.getByRole('status').filter({ hasText: 'current ownership could not be loaded' }),
    ).toBeVisible();
    await expect(
      panel.getByRole('button', { name: `Choose article ${second.slug}`, exact: true }),
    ).toBeDisabled();
    await expect(
      panel.getByRole('button', { name: 'Review author reassignment', exact: true }),
    ).toBeDisabled();
    await expect(
      panel.getByRole('button', { name: 'Retry original request', exact: true }),
    ).toHaveCount(0);
    const latest = panel.getByRole('button', {
      name: 'Load latest article ownership',
      exact: true,
    });
    await expect(latest).toBeEnabled();
    expect((await currentPost(admin.session, first.id)).author.id).toBe(target.id);
    await latest.click();
    await expect(
      panel.getByRole('status').filter({ hasText: 'Latest article loaded.' }),
    ).toBeVisible();
    await expect(panel).toContainText(`Last loaded author: ${target.displayName}`);
    await expect(
      panel.getByRole('button', { name: `Choose article ${second.slug}`, exact: true }),
    ).toBeEnabled();
    await expect(
      panel.getByRole('button', { name: 'Review author reassignment', exact: true }),
    ).toBeDisabled();
  } finally {
    await admin.page.unroute(path, loseReadback);
  }
});

test('a successful staff access change keeps member selection locked until its fresh member readback completes', async ({
  browser,
}) => {
  const admin = await login(browser, 'admin');
  const members = await admin.session.request.get('/api/editorial/admin/members?pageSize=20');
  expect(members.status()).toBe(200);
  const initial = ((await members.json()).data as StaffMember[]).find(
    (member) => member.role === 'AUTHOR' && member.id !== admin.memberId,
  );
  if (!initial) throw new Error('A first-page non-administrator fixture member is required.');
  const requestedRole = initial.role === 'AUTHOR' ? 'EDITOR' : 'AUTHOR';
  await admin.page.goto('/studio/admin');
  const panel = admin.page.getByRole('region', { name: 'Staff members', exact: true });
  const row = panel
    .getByRole('listitem')
    .filter({ has: admin.page.getByText(initial.email, { exact: true }) });
  await row.getByRole('button', { name: `Manage ${initial.displayName}`, exact: true }).click();
  const editor = panel.getByRole('region', { name: `Manage ${initial.displayName}`, exact: true });
  await expect(editor).toBeVisible();
  await editor.getByRole('combobox', { name: /^Role\b/ }).selectOption(requestedRole);
  const responseGate = gate();
  let readbackSeen = false;
  const path = `**/api/editorial/admin/members/${initial.id}`;
  let failed = false;
  await admin.page.route(path, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    expect(response.status()).toBe(200);
    readbackSeen = true;
    await responseGate.promise;
    await route.fulfill({ response });
  });
  try {
    await editor.getByRole('button', { name: 'Review access change', exact: true }).click();
    await editor.getByRole('button', { name: 'Change staff access', exact: true }).click();
    await expect.poll(() => readbackSeen).toBe(true);
    const otherChoice = panel
      .getByRole('listitem')
      .filter({ hasNot: admin.page.getByText(initial.email, { exact: true }) })
      .getByRole('button', { name: /^Manage / })
      .first();
    await expect(otherChoice).toBeDisabled();
    await expect(
      panel.getByRole('button', { name: 'Refresh members', exact: true }),
    ).toBeDisabled();
    await otherChoice.click({ force: true });
    await expect(editor).toBeVisible();
    responseGate.release();
    await expect(otherChoice).toBeEnabled();
    expect((await currentMember(admin.session, initial.id)).role).toBe(requestedRole);
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    responseGate.release();
    await admin.page.unroute(path);
    try {
      const current = await currentMember(admin.session, initial.id);
      if (current.role !== initial.role || current.active !== initial.active) {
        const restored = await staffMutation(admin.session, `/admin/members/${initial.id}`, {
          method: 'PATCH',
          version: current.version,
          content: { role: initial.role, active: initial.active },
        });
        expect(restored.response.status()).toBe(200);
      }
    } catch (error) {
      if (!failed) throw error;
      test.info().annotations.push({
        type: 'cleanup',
        description: 'Inspect the disposable member after the original readback test failure.',
      });
    }
  }
});
