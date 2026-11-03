import { randomUUID } from 'node:crypto';
import type { BrowserContext, Locator, Page } from '@playwright/test';
import type { Invitation } from '../../src/features/members/admin-contract';
import { test, expect, login, control, staffMutation, stack } from './staff-test-helpers';

async function openAdmin(page: Page) {
  await page.goto('/studio/admin');
  await expect(
    page.getByRole('heading', { name: 'Staff access administration', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Refresh invitations', exact: true }),
  ).toBeEnabled();
}
async function issueInBrowser(page: Page, email: string) {
  const panel = page.getByRole('region', { name: 'Invitations', exact: true });
  await panel.getByLabel('Invited email', { exact: true }).fill(email);
  await panel.getByRole('button', { name: 'Review invitation', exact: true }).click();
  await panel.getByRole('button', { name: 'Issue invitation', exact: true }).click();
  const receipt = panel.getByRole('region', { name: 'Invitation receipt', exact: true });
  await expect(receipt).toBeVisible();
  await expect(
    panel.getByRole('button', { name: 'Refresh invitations', exact: true }),
  ).toBeEnabled();
  return { panel, receipt, link: receipt.getByLabel('Private invitation link', { exact: true }) };
}
async function invitationRow(
  page: Page,
  panel: Locator,
  email: string,
  status: string,
  first: Invitation[],
) {
  let current = first;
  const row = panel
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { name: email, exact: true }) });
  for (let index = 0; index < 50; index++) {
    expect(current.every((invitation) => invitation.status === status)).toBe(true);
    if (current.length)
      await expect(panel.getByRole('listitem').first().getByRole('heading')).toHaveText(
        current[0].email,
      );
    else await expect(panel.getByRole('listitem')).toHaveCount(0);
    if (current.some((invitation) => invitation.email === email)) {
      await expect(row).toBeVisible();
      return row;
    }
    const next = panel.getByRole('button', { name: 'Next invitations', exact: true });
    await expect(next).toBeEnabled();
    const response = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return (
        url.pathname === '/api/editorial/admin/invitations' &&
        url.searchParams.get('status') === status &&
        url.searchParams.has('cursor') &&
        response.request().method() === 'GET'
      );
    });
    await next.click();
    const result = await response;
    expect(result.status()).toBe(200);
    current = (await result.json()).data;
  }
  throw new Error(
    'The expected synthetic invitation was not found within the bounded cursor traversal.',
  );
}

test('invitation copy uses the actual clipboard and safely supports denied or absent clipboard access', async ({
  browser,
}) => {
  const admin = await login(browser, 'admin');
  await admin.session.grantPermissions(['clipboard-read', 'clipboard-write'], {
    origin: stack.webOrigin,
  });
  await openAdmin(admin.page);
  const priorClipboard = await admin.page
    .evaluate(() => navigator.clipboard.readText())
    .catch(() => null);
  const browserProtocol = await browser.newBrowserCDPSession();
  const pageProtocol = await admin.session.newCDPSession(admin.page);
  const { targetInfo } = await pageProtocol.send('Target.getTargetInfo');
  const permission = async (setting: 'granted' | 'denied') =>
    browserProtocol.send('Browser.setPermission', {
      permission: { name: 'clipboard-write' },
      setting,
      origin: stack.webOrigin,
      browserContextId: targetInfo.browserContextId,
    });
  const errors: string[] = [];
  admin.page.on('pageerror', (error) => errors.push(error.message));
  try {
    const { panel, receipt, link } = await issueInBrowser(
      admin.page,
      `staff-clipboard-${randomUUID()}@example.test`,
    );
    const value = await link.inputValue();
    const copy = receipt.getByRole('button', { name: 'Copy invitation link', exact: true });
    await copy.click();
    await expect(panel.getByRole('status')).toHaveText('Invitation link copied.');
    // Return only equality so a failed check cannot print a previous clipboard value.
    expect(
      await admin.page.evaluate(
        async (expected) => (await navigator.clipboard.readText()) === expected,
        value,
      ),
    ).toBe(true);

    await permission('denied');
    expect(
      await admin.page.evaluate(
        async () =>
          (await navigator.permissions.query({ name: 'clipboard-write' as PermissionName })).state,
      ),
    ).toBe('denied');
    await copy.click();
    await expect(panel.getByRole('status')).toHaveText(
      'Clipboard access is unavailable. Select the invitation link and copy it manually.',
    );
    await expect(link).toHaveValue(value);

    await permission('granted');
    await copy.click();
    await expect(panel.getByRole('status')).toHaveText('Invitation link copied.');
    // A missing platform API is a browser capability fault, not an authentication or API mock.
    await admin.page.evaluate(() =>
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined }),
    );
    await copy.click();
    await expect(panel.getByRole('status')).toHaveText(
      'Clipboard access is unavailable. Select the invitation link and copy it manually.',
    );
    await link.focus();
    expect(
      await link.evaluate((element: HTMLInputElement) => [
        element.selectionStart,
        element.selectionEnd,
      ]),
    ).toEqual([0, value.length]);
    expect(errors).toEqual([]);
    await receipt.getByRole('button', { name: 'Hide private link', exact: true }).click();
    await expect(panel.getByLabel('Private invitation link', { exact: true })).toHaveCount(0);
    await panel.getByRole('button', { name: 'Review invitation', exact: true }).click();
    await panel.getByRole('button', { name: 'Issue invitation', exact: true }).click();
    await expect(panel.locator('.staff-error[role="alert"]')).toContainText(
      'A pending invitation already exists.',
    );
    await panel.getByRole('button', { name: 'Cancel', exact: true }).click();
  } finally {
    await admin.page.evaluate(() => Reflect.deleteProperty(navigator, 'clipboard')).catch(() => {});
    await permission('granted').catch(() => {});
    if (priorClipboard !== null)
      await admin.page
        .evaluate((value) => navigator.clipboard.writeText(value), priorClipboard)
        .catch(() => {});
    await pageProtocol.detach();
    await browserProtocol.detach();
  }
});

test('invitation status filters show accepted, expired, revoked and pending audit details with appropriate actions', async ({
  browser,
}) => {
  control('renew-invitation', 'target');
  const acceptedInvitation = control<{ id: string; email: string; token: string; key: string }>(
    'invitation',
    'target',
  );
  const credential = control<{ idToken: string }>('token', 'target');
  const acceptance = await browser.newContext({ baseURL: stack.webOrigin });
  try {
    const csrf = await acceptance.request.get('/api/csrf');
    expect(csrf.status()).toBe(200);
    const { token } = await csrf.json();
    const accepted = await acceptance.request.post('/api/invitations/accept', {
      headers: {
        Origin: stack.webOrigin,
        'Content-Type': 'application/json',
        'X-CSRF-Token': token,
        'Idempotency-Key': acceptedInvitation.key,
      },
      data: { token: acceptedInvitation.token, idToken: credential.idToken },
    });
    expect(accepted.status()).toBe(200);
    expect((await accepted.json()).member.role).toBe('AUTHOR');
  } finally {
    await acceptance.close();
  }

  const admin = await login(browser, 'admin');
  const issued = await staffMutation(admin.session, '/admin/invitations', {
    content: { email: `staff-revoked-${randomUUID()}@example.test`, role: 'AUTHOR' },
  });
  expect(issued.response.status()).toBe(201);
  const revokedInvitation: Invitation = issued.body.data.invitation;
  const revoked = await staffMutation(
    admin.session,
    `/admin/invitations/${revokedInvitation.id}/revoke`,
    { version: revokedInvitation.version, content: {} },
  );
  expect(revoked.response.status()).toBe(200);
  const pending = stack.fixture.invitations.invitee as { id: string; email: string };
  const expired = stack.fixture.invitations.expired as { id: string; email: string };
  await openAdmin(admin.page);
  const panel = admin.page.getByRole('region', { name: 'Invitations', exact: true });
  for (const expected of [
    { status: 'ACCEPTED', invitation: acceptedInvitation, times: 3, reissue: false, revoke: false },
    { status: 'EXPIRED', invitation: expired, times: 2, reissue: true, revoke: true },
    { status: 'REVOKED', invitation: revokedInvitation, times: 3, reissue: true, revoke: false },
    { status: 'PENDING', invitation: pending, times: 2, reissue: true, revoke: true },
  ]) {
    await panel
      .getByRole('combobox', { name: /^Invitation status\b/ })
      .selectOption(expected.status);
    const response = admin.page.waitForResponse((response) => {
      const url = new URL(response.url());
      return (
        url.pathname === '/api/editorial/admin/invitations' &&
        url.searchParams.get('status') === expected.status &&
        response.request().method() === 'GET'
      );
    });
    await panel.getByRole('button', { name: 'Apply invitation filter', exact: true }).click();
    const payload = await (await response).json();
    expect(
      payload.data.every((invitation: Invitation) => invitation.status === expected.status),
    ).toBe(true);
    const row = await invitationRow(
      admin.page,
      panel,
      expected.invitation.email,
      expected.status,
      payload.data,
    );
    await expect(row).toContainText(`· ${expected.status.toLowerCase()} ·`);
    await expect(row.locator('time')).toHaveCount(expected.times);
    for (const time of await row.locator('time').all()) {
      expect(await time.getAttribute('datetime')).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      await expect(time).toContainText(/\([A-Za-z_/+-]+\)/);
    }
    await expect(
      row.getByRole('button', { name: `Reissue for ${expected.invitation.email}`, exact: true }),
    ).toHaveCount(expected.reissue ? 1 : 0);
    await expect(
      row.getByRole('button', { name: `Revoke for ${expected.invitation.email}`, exact: true }),
    ).toHaveCount(expected.revoke ? 1 : 0);
    await expect(panel.getByLabel('Private invitation link', { exact: true })).toHaveCount(0);
  }
  expect(await admin.page.content()).not.toContain(acceptedInvitation.token);
});

type CursorPage = {
  data: { id: string; email?: string; createdAt: string }[];
  meta: { pagination: { hasMore: boolean; nextCursor: string | null } };
};
async function pages(session: BrowserContext, path: string) {
  const output: CursorPage[] = [];
  let cursor: string | null = null;
  for (let index = 0; index < 50; index++) {
    const url = new URL(`/api/editorial${path}`, stack.webOrigin);
    url.searchParams.set('pageSize', '20');
    if (cursor) url.searchParams.set('cursor', cursor);
    const response = await session.request.get(url.toString());
    expect(response.status()).toBe(200);
    const page: CursorPage = await response.json();
    output.push(page);
    if (!page.meta.pagination.hasMore) return output;
    expect(page.meta.pagination.nextCursor).toBeTruthy();
    cursor = page.meta.pagination.nextCursor;
  }
  throw new Error('Synthetic staff cursor traversal exceeded its bounded page count.');
}
async function walk(
  page: Page,
  panel: Locator,
  expected: CursorPage[],
  kind: 'members' | 'invitations' | 'audit',
) {
  const values: string[] = [];
  const resourceIds: string[] = [];
  for (let index = 0; index < expected.length; index++) {
    const rows = panel.getByRole('listitem');
    await expect(rows).toHaveCount(expected[index].data.length);
    const wanted = expected[index].data.map((item) =>
      kind === 'audit' ? item.createdAt : item.email!,
    );
    const actual =
      kind === 'audit'
        ? panel.locator('li article time')
        : kind === 'members'
          ? panel.locator('li > div > p')
          : panel.locator('li h3');
    if (kind === 'audit') {
      await expect(actual.first()).toHaveAttribute('datetime', wanted[0]);
      expect(
        await actual.evaluateAll((elements) =>
          elements.map((element) => element.getAttribute('datetime')),
        ),
      ).toEqual(wanted);
    } else {
      await expect(actual.first()).toHaveText(wanted[0]);
      expect(await actual.allTextContents()).toEqual(wanted);
    }
    values.push(...wanted);
    resourceIds.push(...expected[index].data.map((item) => item.id));
    const next = panel.getByRole('button', {
      name: kind === 'audit' ? 'Next audit events' : `Next ${kind}`,
      exact: true,
    });
    if (index === expected.length - 1) {
      await expect(next).toHaveCount(0);
      break;
    }
    const response = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return (
        url.pathname === `/api/editorial/admin/${kind === 'audit' ? 'audit-events' : kind}` &&
        url.searchParams.has('cursor') &&
        response.request().method() === 'GET'
      );
    });
    await next.click();
    expect((await response).status()).toBe(200);
  }
  // Reissued invitations legitimately reuse an email; resource identity remains unique.
  expect(new Set(resourceIds).size).toBe(resourceIds.length);
  return values;
}

test('staff members, invitations and filtered audit logs traverse every real cursor page without duplicates', async ({
  browser,
}) => {
  const fixture = control<{
    members: { id: string; email: string }[];
    invitations: { id: string; email: string }[];
    audit: { subjectId: string; eventCount: number; action: string };
  }>('staff-list-seed');
  try {
    const admin = await login(browser, 'admin');
    const memberPages = await pages(admin.session, '/admin/members');
    const invitationPages = await pages(admin.session, '/admin/invitations');
    const auditPath = `/admin/audit-events?subjectType=MEMBER&subjectId=${fixture.audit.subjectId}&action=${fixture.audit.action}`;
    const auditPages = await pages(admin.session, auditPath);
    expect(memberPages.length).toBeGreaterThan(1);
    expect(invitationPages.length).toBeGreaterThan(1);
    expect(auditPages.length).toBeGreaterThan(1);
    await openAdmin(admin.page);
    const members = await walk(
      admin.page,
      admin.page.getByRole('region', { name: 'Staff members', exact: true }),
      memberPages,
      'members',
    );
    for (const row of fixture.members) expect(members).toContain(row.email);
    const invitations = await walk(
      admin.page,
      admin.page.getByRole('region', { name: 'Invitations', exact: true }),
      invitationPages,
      'invitations',
    );
    for (const row of fixture.invitations) expect(invitations).toContain(row.email);
    const audit = admin.page.getByRole('region', { name: 'Staff audit log', exact: true });
    await audit.getByLabel('Resource type', { exact: true }).fill('MEMBER');
    await audit.getByLabel('Resource ID', { exact: true }).fill(fixture.audit.subjectId);
    await audit.getByLabel('Action', { exact: true }).fill(fixture.audit.action);
    const filtered = admin.page.waitForResponse((response) => {
      const url = new URL(response.url());
      return (
        url.pathname === '/api/editorial/admin/audit-events' &&
        url.searchParams.get('subjectId') === fixture.audit.subjectId &&
        !url.searchParams.has('cursor')
      );
    });
    await audit.getByRole('button', { name: 'Apply audit filters', exact: true }).click();
    expect((await filtered).status()).toBe(200);
    expect((await walk(admin.page, audit, auditPages, 'audit')).length).toBe(
      fixture.audit.eventCount,
    );
  } finally {
    expect(control<{ cleaned: boolean }>('staff-list-cleanup').cleaned).toBe(true);
  }
});
