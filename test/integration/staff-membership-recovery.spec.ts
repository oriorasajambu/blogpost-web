import type { BrowserContext } from '@playwright/test';
import type { StaffMember } from '../../src/lib/auth-contract';
import { test, expect, login, staffMutation } from './staff-test-helpers';

async function currentMember(session: BrowserContext, id?: string): Promise<StaffMember> {
  const response = await session.request.get(
    id ? `/api/editorial/admin/members/${id}` : '/api/editorial/me',
  );
  expect(response.status()).toBe(200);
  return (await response.json()).data;
}

test('an in-flight or uncertain staff access change keeps its member and exact retry when another member is selected', async ({
  browser,
}) => {
  const admin = await login(browser, 'admin');
  const other = await login(browser, 'other');
  const target = await currentMember(other.session);
  const self = await currentMember(admin.session);
  const path = `**/api/editorial/admin/members/${target.id}`;
  const selfPath = `**/api/editorial/admin/members/${self.id}`;
  const attempts: { key?: string; version?: string; body: string | null }[] = [];
  let releaseSelection!: () => void;
  const selectionGate = new Promise<void>((resolve) => {
    releaseSelection = resolve;
  });
  let selectionHeld!: () => void;
  const heldSelection = new Promise<void>((resolve) => {
    selectionHeld = resolve;
  });
  let releaseResponse!: () => void;
  const responseGate = new Promise<void>((resolve) => {
    releaseResponse = resolve;
  });
  let committed!: () => void;
  const firstCommitted = new Promise<void>((resolve) => {
    committed = resolve;
  });
  let dropped = false;
  let failed = false;
  try {
    await admin.page.goto('/studio/admin');
    const panel = admin.page.getByRole('region', { name: 'Staff members', exact: true });
    const item = panel
      .getByRole('listitem')
      .filter({ has: admin.page.getByText(target.email, { exact: true }) });
    await item.getByRole('button', { name: `Manage ${target.displayName}`, exact: true }).click();
    const editor = panel.getByRole('region', { name: `Manage ${target.displayName}`, exact: true });
    const requestedRole = target.role === 'AUTHOR' ? 'EDITOR' : 'AUTHOR';
    await editor.getByRole('combobox', { name: /^Role\b/ }).selectOption(requestedRole);
    const selfChoice = panel
      .getByRole('listitem')
      .filter({ has: admin.page.getByText(self.email, { exact: true }) })
      .getByRole('button', { name: `Manage ${self.displayName}`, exact: true });
    await admin.page.route(selfPath, async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      const response = await route.fetch();
      expect(response.status()).toBe(200);
      selectionHeld();
      await selectionGate;
      await route.fulfill({ response });
    });
    await selfChoice.click();
    await heldSelection;
    await admin.page.route(path, async (route) => {
      if (route.request().method() !== 'PATCH') {
        await route.continue();
        return;
      }
      attempts.push({
        key: route.request().headers()['idempotency-key'],
        version: route.request().headers()['x-expected-version'],
        body: route.request().postData(),
      });
      if (dropped) {
        await route.continue();
        return;
      }
      dropped = true;
      const result = await route.fetch();
      committed();
      expect(result.status()).toBe(200);
      await responseGate;
      await route.abort('connectionreset');
    });
    await editor.getByRole('button', { name: 'Review access change', exact: true }).click();
    await editor.getByRole('button', { name: 'Change staff access', exact: true }).click();
    await firstCommitted;
    const selectionResponse = admin.page.waitForResponse(
      (response) =>
        response.url().endsWith(`/api/editorial/admin/members/${self.id}`) &&
        response.request().method() === 'GET',
    );
    releaseSelection();
    await (await selectionResponse).finished();
    await expect(editor).toBeVisible();
    await expect(selfChoice).toBeDisabled();
    await expect(
      panel.getByRole('button', { name: 'Refresh members', exact: true }),
    ).toBeDisabled();
    await expect(
      panel.getByRole('button', { name: 'Apply member filters', exact: true }),
    ).toBeDisabled();
    releaseResponse();
    const retry = editor.getByRole('button', { name: 'Retry original request', exact: true });
    await expect(retry).toBeEnabled();
    await expect(selfChoice).toBeDisabled();
    await selfChoice.click({ force: true });
    await expect(editor).toBeVisible();
    await expect(retry).toBeEnabled();
    await retry.click();
    await expect(
      editor.getByRole('status').filter({ hasText: 'Staff access change completed.' }),
    ).toBeVisible();
    expect(attempts).toHaveLength(2);
    expect(attempts[1]).toEqual(attempts[0]);
    const current = await currentMember(admin.session, target.id);
    expect(current.role).toBe(requestedRole);
    expect(current.version).toBe(target.version + 1);
    await expect(selfChoice).toBeEnabled();
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    releaseSelection();
    releaseResponse();
    await admin.page.unroute(path);
    await admin.page.unroute(selfPath);
    try {
      const current = await currentMember(admin.session, target.id);
      if (current.role !== target.role || current.active !== target.active) {
        const restored = await staffMutation(admin.session, `/admin/members/${target.id}`, {
          method: 'PATCH',
          version: current.version,
          content: { role: target.role, active: target.active },
        });
        expect(restored.response.status()).toBe(200);
      }
    } catch (error) {
      if (!failed) throw error;
      test.info().annotations.push({
        type: 'cleanup',
        description:
          'Inspect this disposable stack: member restoration failed after the original test failure.',
      });
    }
  }
});
