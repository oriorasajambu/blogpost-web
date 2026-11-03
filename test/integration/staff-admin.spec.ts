import { randomUUID } from 'node:crypto';
import AxeBuilder from '@axe-core/playwright';
import type { BrowserContext, Page } from '@playwright/test';
import type { StaffMember } from '../../src/lib/auth-contract';
import type { AdminMember, Invitation } from '../../src/features/members/admin-contract';
import type { WorkspacePost } from '../../src/features/editor/editor-contract';
import { test, expect, login, control, staffMutation, stack } from './staff-test-helpers';

async function me(session: BrowserContext): Promise<StaffMember> {
  const response = await session.request.get('/api/editorial/me', { timeout: 10_000 });
  expect(response.status()).toBe(200);
  return (await response.json()).data;
}
async function member(session: BrowserContext, id: string): Promise<AdminMember> {
  const response = await session.request.get(`/api/editorial/admin/members/${id}`, {
    timeout: 10_000,
  });
  expect(response.status()).toBe(200);
  return (await response.json()).data;
}
async function openAdmin(page: Page) {
  page.setDefaultTimeout(10_000);
  await test.step('Open authorized administration and await the member list', async () => {
    await page.goto('/studio/admin', { waitUntil: 'domcontentloaded', timeout: 15_000 });
    await expect(
      page.getByRole('heading', { name: 'Staff access administration', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Refresh members', exact: true })).toBeEnabled();
  });
}
async function manage(page: Page, target: StaffMember) {
  const panel = page.getByRole('region', { name: 'Staff members', exact: true });
  const item = panel
    .getByRole('listitem')
    .filter({ has: page.getByText(target.email, { exact: true }) });
  try {
    await expect(item).toHaveCount(1);
  } catch (error) {
    try {
      await test.info().attach('admin-member-ui', {
        body: await page.locator('main').ariaSnapshot(),
        contentType: 'text/plain',
      });
      const response = await page
        .context()
        .request.get('/api/editorial/admin/members?pageSize=20', { timeout: 10_000 });
      const payload = await response.json();
      await test.info().attach('admin-member-boundary', {
        body: JSON.stringify(
          {
            status: response.status(),
            errorCode: payload.error?.code,
            targetId: target.id,
            data: Array.isArray(payload.data)
              ? payload.data.map((value: Record<string, unknown>) => ({
                  id: value.id,
                  role: value.role,
                  active: value.active,
                  version: value.version,
                  createdAt: value.createdAt,
                  updatedAt: value.updatedAt,
                  keys: Object.keys(value),
                }))
              : null,
            pagination: payload.meta?.pagination,
          },
          null,
          2,
        ),
        contentType: 'application/json',
      });
    } catch {
      /* Preserve the original bounded readiness failure. */
    }
    throw error;
  }
  await expect(
    item.getByRole('button', { name: `Manage ${target.displayName}`, exact: true }),
  ).toBeEnabled();
  await item.getByRole('button', { name: `Manage ${target.displayName}`, exact: true }).click();
  const editor = panel.getByRole('region', { name: `Manage ${target.displayName}`, exact: true });
  await expect(editor).toBeVisible();
  await test.info().attach('admin-member-editor-ui', {
    body: await editor.ariaSnapshot(),
    contentType: 'text/plain',
  });
  return editor;
}
async function restoreMember(session: BrowserContext, initial: StaffMember) {
  const latest = await member(session, initial.id);
  if (latest.role !== initial.role || latest.active !== initial.active) {
    const response = await staffMutation(session, `/admin/members/${initial.id}`, {
      method: 'PATCH',
      version: latest.version,
      content: { role: initial.role, active: initial.active },
    });
    expect(response.response.status()).toBe(200);
  }
}
async function withMemberRestore(
  session: BrowserContext,
  initial: StaffMember,
  work: () => Promise<void>,
) {
  let failed = false;
  try {
    await work();
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    try {
      await restoreMember(session, initial);
    } catch (error) {
      if (!failed) throw error;
      test.info().annotations.push({
        type: 'cleanup',
        description:
          'Synthetic member restoration failed after the original test failure; inspect this owned stack before rerunning.',
      });
    }
  }
}

test('public profile edits keep private identity separate and preserve entered text on a real version conflict', async ({
  browser,
}) => {
  const author = await login(browser);
  const initial = await me(author.session);
  try {
    await author.page.goto('/studio/profile');
    const proposal = `Profile proposal ${randomUUID()}`;
    await author.page.getByLabel('Display name', { exact: true }).fill(proposal);
    await author.page
      .getByLabel('Biography', { exact: true })
      .fill('A public biography, separate from private sign-in details.');
    const concurrent = await staffMutation(author.session, '/me', {
      method: 'PATCH',
      version: initial.version,
      content: { displayName: 'Concurrent public profile', bio: initial.bio },
    });
    expect(concurrent.response.status()).toBe(200);
    await author.page.getByRole('button', { name: 'Save public profile', exact: true }).click();
    await expect(author.page.locator('.staff-error[role="alert"]')).toContainText('changed');
    await expect(author.page.getByLabel('Display name', { exact: true })).toHaveValue(proposal);
    expect((await me(author.session)).displayName).toBe('Concurrent public profile');
    await author.page.getByRole('button', { name: 'Load latest profile', exact: true }).click();
    await expect(author.page.locator('.staff-error[role="alert"]')).toHaveCount(0);
    await author.page.getByText('Current server profile for comparison', { exact: true }).click();
    await expect(author.page.getByText('Concurrent public profile', { exact: true })).toBeVisible();
    await author.page.getByRole('button', { name: 'Save public profile', exact: true }).click();
    await expect(
      author.page.getByRole('status').filter({ hasText: 'Your public profile was saved.' }),
    ).toBeVisible();
    const saved = await me(author.session);
    expect(saved.displayName).toBe(proposal);
    expect(saved.handle).toBe(initial.handle);
    expect(saved.email).toBe(initial.email);
    const privateSection = author.page.getByRole('region', {
      name: 'Private staff account',
      exact: true,
    });
    await expect(privateSection).toContainText(initial.email);
    await expect(privateSection).toContainText('separate from your public author profile');
  } finally {
    const latest = await me(author.session);
    const restored = await staffMutation(author.session, '/me', {
      method: 'PATCH',
      version: latest.version,
      content: { displayName: initial.displayName, bio: initial.bio },
    });
    expect(restored.response.status()).toBe(200);
  }
});

test('administrator confirms role and disablement, authoritative denial takes effect, and audit filters show the actor and time', async ({
  browser,
}) => {
  const admin = await login(browser, 'admin'),
    other = await login(browser, 'other');
  const target = await me(other.session);
  await withMemberRestore(admin.session, target, async () => {
    await openAdmin(admin.page);
    const editor =
      await test.step('Load the chosen member and propose changed permissions', async () => {
        const selected = await manage(admin.page, target);
        await selected.getByRole('combobox', { name: /^Role\b/ }).selectOption('EDITOR');
        await selected.getByLabel('Staff access active', { exact: true }).uncheck();
        return selected;
      });
    await test.step('Cancel the first confirmation without changing permissions', async () => {
      await editor.getByRole('button', { name: 'Review access change', exact: true }).click();
      await expect(
        editor.getByRole('heading', { name: 'Confirm staff access change', exact: true }),
      ).toBeFocused();
      await editor.getByRole('button', { name: 'Cancel', exact: true }).click();
      expect((await member(admin.session, target.id)).active).toBe(true);
    });
    await test.step('Confirm staff access and verify authoritative denial', async () => {
      await editor.getByRole('button', { name: 'Review access change', exact: true }).click();
      await editor.getByRole('button', { name: 'Change staff access', exact: true }).click();
      await expect(
        editor.getByRole('status').filter({ hasText: 'Staff access change completed.' }),
      ).toBeVisible();
      const changed = await member(admin.session, target.id);
      expect(changed.active).toBe(false);
      expect(changed.role).toBe('EDITOR');
      expect(changed.version).toBeGreaterThan(target.version);
      const denied = await other.session.request.get('/api/editorial/posts?scope=OWN&pageSize=20');
      expect(denied.status()).toBe(403);
    });
    await test.step('Filter audit events and inspect actor, time and recorded fields', async () => {
      const audit = admin.page.getByRole('region', { name: 'Staff audit log', exact: true });
      await audit.getByLabel('Resource type', { exact: true }).fill('MEMBER');
      await audit.getByLabel('Resource ID', { exact: true }).fill(target.id);
      await audit.getByLabel('Action', { exact: true }).fill('MEMBER_UPDATED');
      await audit.getByRole('button', { name: 'Apply audit filters', exact: true }).click();
      await expect(
        audit.getByRole('heading', { name: 'member updated', exact: true }).first(),
      ).toBeVisible();
      await expect(audit.locator('time').first()).toContainText(/\([A-Za-z_/+-]+\)/);
      await audit.getByText('Recorded changes', { exact: true }).first().click();
      await expect(audit.locator('pre').first()).toBeVisible();
      const events = await admin.session.request.get(
        `/api/editorial/admin/audit-events?subjectType=MEMBER&subjectId=${target.id}&action=MEMBER_UPDATED&pageSize=20`,
      );
      expect(events.status()).toBe(200);
      const data = (await events.json()).data;
      expect(
        data.some((event: { actor: { id: string } }) => event.actor.id === admin.memberId),
      ).toBe(true);
    });
  });
});

test('last active administrator is protected and stale membership proposals require an explicit refresh', async ({
  browser,
}) => {
  const admin = await login(browser, 'admin'),
    other = await login(browser, 'other');
  const self = await me(admin.session),
    target = await me(other.session);
  await withMemberRestore(admin.session, target, async () => {
    await openAdmin(admin.page);
    let editor = await manage(admin.page, self);
    await editor.getByRole('combobox', { name: /^Role\b/ }).selectOption('AUTHOR');
    await editor.getByRole('button', { name: 'Review access change', exact: true }).click();
    await editor.getByRole('button', { name: 'Change staff access', exact: true }).click();
    await expect(editor.getByRole('alert')).toContainText('Keep at least one active administrator');
    expect((await me(admin.session)).role).toBe('ADMIN');
    await editor.getByRole('button', { name: 'Cancel', exact: true }).click();
    editor = await manage(admin.page, target);
    await editor.getByLabel('Staff access active', { exact: true }).uncheck();
    const concurrent = await staffMutation(admin.session, `/admin/members/${target.id}`, {
      method: 'PATCH',
      version: target.version,
      content: { role: 'EDITOR' },
    });
    expect(concurrent.response.status()).toBe(200);
    await editor.getByRole('button', { name: 'Review access change', exact: true }).click();
    await editor.getByRole('button', { name: 'Change staff access', exact: true }).click();
    await expect(editor.getByRole('alert')).toContainText('changed');
    await expect(editor.getByLabel('Staff access active', { exact: true })).not.toBeChecked();
    expect((await member(admin.session, target.id)).active).toBe(true);
    await editor.getByRole('button', { name: 'Load latest account', exact: true }).click();
    await expect(editor.getByRole('alert')).toHaveCount(0);
    await expect(editor).toContainText('Current role');
    await expect(editor.getByLabel('Staff access active', { exact: true })).not.toBeChecked();
    await expect(
      editor.getByRole('button', { name: 'Review access change', exact: true }),
    ).toBeEnabled();
  });
});

test('invitation issue and revocation display a private one-time link and current audit metadata', async ({
  browser,
}) => {
  const admin = await login(browser, 'admin');
  await openAdmin(admin.page);
  const panel = admin.page.getByRole('region', { name: 'Invitations', exact: true });
  const email = `staff-invite-${randomUUID()}@example.test`;
  await panel.getByLabel('Invited email', { exact: true }).fill(email);
  await panel.getByLabel('Invited role', { exact: true }).selectOption('AUTHOR');
  await panel.getByRole('button', { name: 'Review invitation', exact: true }).click();
  await expect(
    panel.getByRole('heading', { name: 'Confirm staff invitation', exact: true }),
  ).toBeFocused();
  await panel.getByRole('button', { name: 'Issue invitation', exact: true }).click();
  const receipt = panel.getByRole('region', { name: 'Invitation receipt', exact: true });
  await expect(receipt).toBeVisible();
  const secret = await receipt.getByLabel('Private invitation link', { exact: true }).inputValue();
  const url = new URL(secret);
  expect(url.origin).toBe(stack.webOrigin);
  expect(url.pathname).toBe('/invitations/accept');
  expect(/^[A-Za-z0-9_-]{43}$/.test(url.searchParams.get('token') ?? '')).toBe(true);
  await receipt.getByRole('button', { name: 'Hide private link', exact: true }).click();
  await expect(panel.getByLabel('Private invitation link', { exact: true })).toHaveCount(0);
  const item = panel
    .getByRole('listitem')
    .filter({ has: admin.page.getByRole('heading', { name: email, exact: true }) });
  await expect(item.locator('time').first()).toBeVisible();
  await item.getByRole('button', { name: `Revoke for ${email}`, exact: true }).click();
  await panel.getByRole('button', { name: 'Revoke invitation', exact: true }).click();
  await expect(
    panel.getByRole('status').filter({ hasText: 'The invitation was revoked.' }),
  ).toBeVisible();
  await expect(item).toContainText('revoked');
  const listed = await admin.session.request.get('/api/editorial/admin/invitations?pageSize=50');
  expect(listed.status()).toBe(200);
  const invitation = (await listed.json()).data.find((value: Invitation) => value.email === email);
  expect(invitation.status).toBe('REVOKED');
});

test('a committed invitation response loss reuses the exact operation and offers explicit secret replacement', async ({
  browser,
}) => {
  const admin = await login(browser, 'admin');
  await openAdmin(admin.page);
  const panel = admin.page.getByRole('region', { name: 'Invitations', exact: true });
  const email = `staff-lost-link-${randomUUID()}@example.test`;
  const requests: { key: string | undefined; body: string | null }[] = [];
  let dropped = false;
  await admin.page.route('**/api/editorial/admin/invitations', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    requests.push({
      key: route.request().headers()['idempotency-key'],
      body: route.request().postData(),
    });
    if (!dropped) {
      dropped = true;
      const committed = await route.fetch();
      expect(committed.status()).toBe(201);
      await route.abort('failed');
    } else if (requests.length === 2) {
      const rejectedHeaders = { ...route.request().headers() };
      delete rejectedHeaders['x-csrf-token'];
      await route.continue({ headers: rejectedHeaders });
    } else await route.continue();
  });
  await panel.getByLabel('Invited email', { exact: true }).fill(email);
  await panel.getByRole('button', { name: 'Review invitation', exact: true }).click();
  await panel.getByRole('button', { name: 'Issue invitation', exact: true }).click();
  await expect(
    panel.getByRole('button', { name: 'Retry original request', exact: true }),
  ).toBeEnabled();
  await panel.getByRole('button', { name: 'Check current server state', exact: true }).click();
  await expect(
    panel.getByRole('button', {
      name: 'I reviewed the server state; end this operation',
      exact: true,
    }),
  ).toBeVisible();
  const securityFailure = admin.page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === '/api/editorial/admin/invitations' &&
      response.status() === 403,
  );
  await panel.getByRole('button', { name: 'Retry original request', exact: true }).click();
  await securityFailure;
  await expect(
    panel.getByRole('button', { name: 'Retry original request', exact: true }),
  ).toBeEnabled();
  await panel.getByRole('button', { name: 'Retry original request', exact: true }).click();
  await expect(
    panel.getByRole('region', { name: 'Invitation receipt', exact: true }),
  ).toContainText('secret link cannot be recovered');
  expect(requests.length).toBe(3);
  expect(requests[1]).toEqual(requests[0]);
  expect(requests[2]).toEqual(requests[0]);
  await expect(panel.getByLabel('Private invitation link', { exact: true })).toHaveCount(0);
  let reissueDropped = false;
  await admin.page.route('**/api/editorial/admin/invitations/*/reissue', async (route) => {
    if (!reissueDropped) {
      reissueDropped = true;
      expect((await route.fetch()).status()).toBe(201);
      await route.abort('failed');
    } else await route.continue();
  });
  await panel.getByRole('button', { name: 'Review replacement invitation', exact: true }).click();
  await panel.getByRole('button', { name: 'Issue replacement link', exact: true }).click();
  await expect(
    panel.getByRole('button', { name: 'Retry original request', exact: true }),
  ).toBeEnabled();
  await expect(
    panel.getByRole('button', {
      name: 'I reviewed the server state; end this operation',
      exact: true,
    }),
  ).toHaveCount(0);
  await panel.getByRole('button', { name: 'Retry original request', exact: true }).click();
  await expect(
    panel.getByRole('region', { name: 'Invitation receipt', exact: true }),
  ).toContainText('secret link cannot be recovered');
  await panel.getByRole('button', { name: 'Review replacement invitation', exact: true }).click();
  await panel.getByRole('button', { name: 'Issue replacement link', exact: true }).click();
  await expect(panel.getByLabel('Private invitation link', { exact: true })).toBeVisible();
  const listed = await admin.session.request.get('/api/editorial/admin/invitations?pageSize=50');
  expect(listed.status()).toBe(200);
  const matches = (await listed.json()).data.filter((value: Invitation) => value.email === email);
  expect(matches.length).toBe(3);
  expect(matches.filter((value: Invitation) => value.status === 'REVOKED').length).toBe(2);
  expect(matches.filter((value: Invitation) => value.status === 'PENDING').length).toBe(1);
});

test('admin attribution transfer creates a new draft, preserves the published snapshot, and removes former-owner access', async ({
  browser,
}) => {
  const created = control<WorkspacePost>('create-post', {
    published: true,
    content: { title: `Attribution ${randomUUID()}` },
  });
  const admin = await login(browser, 'admin'),
    author = await login(browser),
    other = await login(browser, 'other');
  const target = await me(other.session);
  await openAdmin(admin.page);
  const panel = admin.page.getByRole('region', { name: 'Author reassignment', exact: true });
  await panel
    .getByRole('button', { name: `Choose article ${created.slug ?? created.id}`, exact: true })
    .click();
  const targetItem = panel.getByRole('listitem').filter({
    has: admin.page.getByText(`${target.email} · ${target.role.toLowerCase()}`, { exact: true }),
  });
  await targetItem
    .getByRole('button', { name: `Choose author ${target.displayName}`, exact: true })
    .click();
  await panel.getByRole('button', { name: 'Review author reassignment', exact: true }).click();
  await expect(
    panel.getByRole('heading', { name: 'Confirm author reassignment', exact: true }),
  ).toBeFocused();
  await panel.getByRole('button', { name: 'Reassign author', exact: true }).click();
  await expect(
    panel.getByRole('status').filter({ hasText: 'Author reassignment completed.' }),
  ).toBeVisible();
  const response = await admin.session.request.get(`/api/editorial/posts/${created.id}`);
  expect(response.status()).toBe(200);
  const changed = (await response.json()).data as WorkspacePost;
  expect(changed.author.id).toBe(target.id);
  expect(changed.workingRevisionId).not.toBe(created.workingRevisionId);
  expect(changed.workingRevision?.creditedAuthor.id).toBe(target.id);
  expect(changed.workflowState).toBe('DRAFT');
  expect(changed.publishedRevisionId).toBe(created.publishedRevisionId);
  expect((await author.session.request.get(`/api/editorial/posts/${created.id}`)).status()).toBe(
    404,
  );
  expect((await other.session.request.get(`/api/editorial/posts/${created.id}`)).status()).toBe(
    200,
  );
  const events = await admin.session.request.get(
    `/api/editorial/admin/audit-events?subjectType=POST&subjectId=${created.id}&pageSize=50`,
  );
  expect(events.status()).toBe(200);
  expect(
    (await events.json()).data.some(
      (event: { actor: { id: string }; action: string }) =>
        event.actor.id === admin.memberId && event.action.toLowerCase().includes('author'),
    ),
  ).toBe(true);
});

test('author and editor cannot enter staff administration or call administrative data operations', async ({
  browser,
}) => {
  for (const label of ['author', 'editor']) {
    const user = await login(browser, label);
    await user.page.goto('/studio/admin');
    await expect(
      user.page.getByRole('heading', {
        name: 'This area is not available for your role.',
        exact: true,
      }),
    ).toBeVisible();
    for (const path of ['/admin/members', '/admin/invitations', '/admin/audit-events'])
      expect((await user.session.request.get(`/api/editorial${path}`)).status()).toBe(403);
    await expect(user.page.getByLabel('Invited email', { exact: true })).toHaveCount(0);
  }
});

test('admin and profile controls reflow in both themes and return keyboard focus after confirmation', async ({
  browser,
}) => {
  test.setTimeout(150_000);
  const admin = await login(browser, 'admin'),
    other = await login(browser, 'other');
  const target = await me(other.session);
  await openAdmin(admin.page);
  const editor = await manage(admin.page, target);
  await editor
    .getByRole('combobox', { name: /^Role\b/ })
    .selectOption(target.role === 'AUTHOR' ? 'EDITOR' : 'AUTHOR');
  const trigger = editor.getByRole('button', { name: 'Review access change', exact: true });
  await trigger.focus();
  await admin.page.keyboard.press('Enter');
  await expect(
    editor.getByRole('heading', { name: 'Confirm staff access change', exact: true }),
  ).toBeFocused();
  await editor.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(trigger).toBeFocused();
  await expect(trigger).toBeEnabled();
  await trigger.click();
  await expect(
    editor.getByRole('heading', { name: 'Confirm staff access change', exact: true }),
  ).toBeFocused();
  await editor.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(trigger).toBeFocused();
  for (const route of ['/studio/admin', '/studio/profile']) {
    if (route === '/studio/profile') {
      await admin.page.goto(route);
      await expect(
        admin.page.getByRole('button', { name: 'Save public profile', exact: true }),
      ).toBeEnabled();
    } else {
      await expect(
        admin.page.getByRole('button', { name: 'Refresh audit log', exact: true }),
      ).toBeEnabled();
      await expect(
        admin.page.getByRole('button', { name: 'Refresh invitations', exact: true }),
      ).toBeEnabled();
    }
    for (const width of [1440, 390])
      for (const theme of ['light', 'dark']) {
        await admin.page.setViewportSize({ width, height: 900 });
        await admin.page.evaluate((value) => {
          document.documentElement.dataset.theme = value;
          document.documentElement.style.colorScheme = value;
        }, theme);
        expect(
          await admin.page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        ).toBe(true);
        expect((await new AxeBuilder({ page: admin.page }).analyze()).violations).toEqual([]);
      }
  }
});
