import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Email and password accounts against the real backend, its Authentication Emulator and the
 * Firebase web SDK. Emails are not read: the stack uses the backend's log driver, so the one-time
 * codes that the links carry are fetched from the emulator, and the outbox rows are checked in SQL.
 */
const context = JSON.parse(readFileSync('.local/live-identity/context.json', 'utf8'));
const fixture = (action: string, label = 'author', extra?: string) =>
  JSON.parse(
    execFileSync(
      process.execPath,
      ['test/integration/live-identity-backend.mjs', action, label, ...(extra ? [extra] : [])],
      { encoding: 'utf8', windowsHide: true },
    ),
  );
type AccountState = {
  member: { status: string; active: boolean; role: string } | null;
  emails: { kind: string; status: string }[];
};
const state = (email: string) => fixture('account-state', email) as AccountState;
const code = (email: string, type: string) => fixture('oob', email, type).code as string;
const unique = () => `acct-ui-${randomUUID()}@example.test`;
const passphrase = () => `pw-${randomUUID()}-passphrase`;
/** Always-fresh member so independent tests never share an identity quota. */
const member = (kind: 'password-member' | 'google-member', label: string, role = 'AUTHOR') =>
  fixture(kind, label, role) as { email: string; password: string };

/** The form error; the framework's route announcer is also an alert. */
const alert = (page: Page) => page.locator('p[role="alert"]');
const status = (page: Page) => page.locator('p[role="status"]');
async function fillSignIn(page: Page, email: string, password: string) {
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}
async function signIn(page: Page, email: string, password: string, destination = '/studio/posts') {
  await page.goto('/sign-in');
  await fillSignIn(page, email, password);
  await page.waitForURL(`**${destination}`);
}
async function noViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations.map((violation) => violation.id)).toEqual([]);
}
async function register(page: Page, email: string, password: string) {
  await page.goto('/register');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Repeat password').fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Check your inbox' })).toBeVisible();
}

test('registration, email verification and approval gate sign-in step by step', async ({
  page,
}) => {
  const email = unique();
  const password = passphrase();
  await page.goto('/register');
  await noViolations(page);
  await register(page, email, password);

  // A pending member exists and one verification email was sent.
  const registered = state(email);
  expect(registered.member).toMatchObject({ status: 'PENDING', active: false, role: 'AUTHOR' });
  expect(registered.emails).toEqual([{ kind: 'VERIFY_EMAIL', status: 'SENT' }]);

  // Registering the same address again looks identical and creates nothing new.
  await register(page, email, password);
  expect(state(email).member).toMatchObject({ status: 'PENDING' });

  // Not verified yet: sign-in explains why and offers a new link.
  await page.goto('/sign-in');
  await fillSignIn(page, email, password);
  await expect(alert(page)).toContainText('Confirm your email address first');
  await expect(page.getByRole('link', { name: 'Send a new verification email' })).toBeVisible();

  // The emailed link asks for a click before it uses the one-time code.
  await page.goto(`/verify-email?code=${code(email, 'VERIFY_EMAIL')}`);
  await expect(page.getByRole('heading', { name: 'Confirm your email' })).toBeVisible();
  await page.getByRole('button', { name: 'Confirm my email' }).click();
  await expect(page.getByRole('heading', { name: 'Email confirmed' })).toBeVisible();

  // Verified but still pending: no session, a clear message.
  await page.goto('/sign-in');
  await fillSignIn(page, email, password);
  await expect(alert(page)).toContainText('waiting for approval');
  await expect(page).toHaveURL(/\/sign-in/);

  // Once an administrator approves the account the same credentials work.
  fixture('approve', email);
  await fillSignIn(page, email, password);
  await page.waitForURL('**/studio/posts');
  expect(state(email).member).toMatchObject({ status: 'ACTIVE', active: true });
});

test('registration rejects bad input in the browser and a wrong code on the server', async ({
  page,
}) => {
  const email = unique();
  await page.goto('/register');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('too short');
  await page.getByLabel('Repeat password').fill('too short');
  // The browser enforces the minimum length before anything is sent.
  const requests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/account/')) requests.push(request.url());
  });
  await page.getByRole('button', { name: 'Create account' }).click();
  expect(
    await page
      .getByLabel('Password', { exact: true })
      .evaluate((e: HTMLInputElement) => e.validity.tooShort),
  ).toBe(true);
  expect(requests).toEqual([]);

  const password = passphrase();
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Repeat password').fill(`${password}x`);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(alert(page)).toContainText('do not match');
  expect(requests).toEqual([]);
  expect(state(email).member).toBeNull();

  // A verification link with an unknown code fails cleanly and offers a new one.
  await page.goto(`/verify-email?code=${'A'.repeat(40)}`);
  await page.getByRole('button', { name: 'Confirm my email' }).click();
  await expect(alert(page)).toContainText('expired or was already used');
  await expect(page.getByRole('heading', { name: 'Send a new verification email' })).toBeVisible();
});

test('forgot password answers alike, the link works once, and old credentials stop working', async ({
  page,
}) => {
  const { email, password } = member('password-member', 'forgot');
  await page.goto('/forgot-password');
  await noViolations(page);
  const message = 'If that address has an account';
  const ask = async (address: string) => {
    await page.goto('/forgot-password');
    await page.getByLabel('Email address').fill(address);
    await page.getByRole('button', { name: 'Send reset link' }).click();
    await expect(status(page)).toContainText(message);
  };
  const unknown = unique();
  await ask(unknown);
  expect(state(unknown).emails).toEqual([]);
  await ask(email);
  expect(state(email).emails.map((mail) => mail.kind)).toContain('PASSWORD_RESET');

  const link = `/reset-password?code=${code(email, 'PASSWORD_RESET')}`;
  await page.goto(link);
  await noViolations(page);
  const replacement = passphrase();
  await page.getByLabel('New password', { exact: true }).fill(replacement);
  await page.getByLabel('Repeat password').fill(replacement);
  await page.getByRole('button', { name: 'Save password' }).click();
  await expect(page.getByRole('heading', { name: 'Password changed' })).toBeVisible();
  expect(state(email).emails.map((mail) => mail.kind)).toContain('PASSWORD_CHANGED_NOTICE');

  // The old password no longer works; the new one does.
  await page.goto('/sign-in');
  await fillSignIn(page, email, password);
  await expect(alert(page)).toContainText('email address or password is not correct');
  await fillSignIn(page, email, replacement);
  await page.waitForURL('**/studio/posts');

  // The same link cannot be used again.
  await page.goto(link);
  await page.getByLabel('New password', { exact: true }).fill(passphrase());
  await page.getByLabel('Repeat password').fill(passphrase());
  await page.getByLabel('New password', { exact: true }).fill(replacement + '2');
  await page.getByLabel('Repeat password').fill(replacement + '2');
  await page.getByRole('button', { name: 'Save password' }).click();
  await expect(alert(page)).toContainText('expired or was already used');
});

test('a signed-in member changes their password and is signed out everywhere', async ({ page }) => {
  const { email, password } = member('password-member', 'change');
  await signIn(page, email, password);
  await page.goto('/studio/profile');
  await expect(page.getByRole('heading', { name: 'Sign-in and security' })).toBeVisible();
  const replacement = passphrase();
  const fill = async (current: string) => {
    await page.locator('#security-current').fill(current);
    await page.locator('#security-new').fill(replacement);
    await page.locator('#security-repeat').fill(replacement);
    await page.getByRole('button', { name: 'Change password' }).click();
  };
  // The current password is required: a wrong one changes nothing.
  await fill(`${password}-wrong`);
  await expect(alert(page)).toContainText('current password is not correct');
  await expect(page).toHaveURL(/\/studio\/profile/);

  await fill(password);
  await page.waitForURL('**/sign-in');
  expect(state(email).emails.map((mail) => mail.kind)).toContain('PASSWORD_CHANGED_NOTICE');

  // The session ended and only the new password works.
  const response = await page.request.get('/api/session');
  expect((await response.json()).member).toBeNull();
  await fillSignIn(page, email, password);
  await expect(alert(page)).toContainText('email address or password is not correct');
  await fillSignIn(page, email, replacement);
  await page.waitForURL('**/studio/posts');
});

test('changing the email address needs the password and the new address to confirm', async ({
  page,
}) => {
  const { email, password } = member('password-member', 'email');
  const changed = unique();
  await signIn(page, email, password);
  await page.goto('/studio/profile');
  await page.locator('#security-email').fill(changed);
  await page.locator('#security-email-password').fill(`${password}-wrong`);
  await page.getByRole('button', { name: 'Send confirmation link' }).click();
  await expect(alert(page)).toContainText('current password is not correct');
  expect(state(changed).emails).toEqual([]);

  await page.locator('#security-email-password').fill(password);
  await page.getByRole('button', { name: 'Send confirmation link' }).click();
  await expect(
    page.locator('p[role="status"]', { hasText: 'address changes only after' }),
  ).toContainText('address changes only after you open the link');
  expect(state(changed).emails.map((mail) => mail.kind)).toEqual(['EMAIL_CHANGE_VERIFY']);
  expect(state(email).emails.map((mail) => mail.kind)).toContain('EMAIL_CHANGE_NOTICE');

  // Nothing changed yet; confirming from the new address switches the sign-in address.
  expect(state(email).member?.active).toBe(true);
  await page.goto(`/confirm-email-change?code=${code(email, 'VERIFY_AND_CHANGE_EMAIL')}`);
  await page.getByRole('button', { name: 'Confirm new email' }).click();
  await expect(page.getByRole('heading', { name: 'Email address changed' })).toBeVisible();
  await page.goto('/sign-in');
  await fillSignIn(page, email, password);
  await expect(alert(page)).toContainText('email address or password is not correct');
  await fillSignIn(page, changed, password);
  await page.waitForURL('**/studio/posts');
  // The member row follows the verified address on that sign-in.
  expect(state(changed).member).toMatchObject({ status: 'ACTIVE', active: true });
});

test('an administrator approves a pending registration and emails password setup links', async ({
  page,
  browser,
}) => {
  const admin = member('password-member', 'approver', 'ADMIN');
  const pending = unique();
  await register(page, pending, passphrase());
  const legacy = member('google-member', 'legacy');
  await signIn(page, admin.email, admin.password);

  await page.goto('/studio/admin');
  await page.getByLabel('Approval').selectOption('PENDING');
  await page.getByRole('button', { name: 'Apply member filters' }).click();
  const row = page.locator('li', { hasText: pending });
  await expect(row).toContainText('Waiting for approval');
  await row.getByRole('button', { name: /Manage/ }).click();
  await page.getByLabel('Staff access active').check();
  await page.getByRole('button', { name: 'Review access change' }).click();
  await page.getByRole('button', { name: 'Change staff access' }).click();
  await expect.poll(() => state(pending).member?.status).toBe('ACTIVE');

  // Members still on Google get a link to choose a password; the account is kept.
  expect(state(legacy.email).emails.map((mail) => mail.kind)).not.toContain('PASSWORD_SET');
  await page.getByRole('button', { name: 'Email password setup links' }).click();
  await page.getByRole('button', { name: 'Send links' }).click();
  await expect(status(page).filter({ hasText: 'sent' })).toContainText('links sent');
  expect(state(legacy.email).emails.filter((mail) => mail.kind === 'PASSWORD_SET')).toEqual([
    { kind: 'PASSWORD_SET', status: 'SENT' },
  ]);
  // A second run leaves them alone once they chose one: see below.
  await page.goto(`/reset-password?code=${code(legacy.email, 'PASSWORD_RESET')}&set=1`);
  await expect(page.getByRole('heading', { name: 'Set your password' })).toBeVisible();
  const chosen = passphrase();
  await page.getByLabel('New password', { exact: true }).fill(chosen);
  await page.getByLabel('Repeat password').fill(chosen);
  await page.getByRole('button', { name: 'Save password' }).click();
  await expect(page.getByRole('heading', { name: 'Password set' })).toBeVisible();
  // A different person on a different browser: this one keeps the administrator's local data.
  const other = await browser.newContext({ baseURL: context.webOrigin });
  try {
    await signIn(await other.newPage(), legacy.email, chosen);
  } finally {
    await other.close();
  }
  // Same account and role as before.
  expect(state(legacy.email).member).toMatchObject({ status: 'ACTIVE', role: 'AUTHOR' });
});

test('signing in again after signing out works when the sign-in page is reached by client-side navigation', async ({
  page,
}) => {
  const { email, password } = member('password-member', 'renavigate');
  await signIn(page, email, password);
  await page.goto('/studio/profile');
  // Sign out from the Studio, which lands on the home page.
  await page.getByRole('button', { name: 'Sign out' }).first().click();
  await page.waitForURL((url) => url.pathname === '/');
  // A client-side navigation keeps the home page's content security policy. The sign-in page must
  // notice that and load itself afresh, otherwise every identity request fails as "could not connect".
  await page.evaluate(() =>
    (window as unknown as { next: { router: { push(path: string): void } } }).next.router.push(
      '/sign-in',
    ),
  );
  await page.waitForURL('**/sign-in');
  await expect(page.getByLabel('Email address')).toBeVisible();
  await fillSignIn(page, email, password);
  await page.waitForURL('**/studio/posts', { timeout: 30_000 });
  await expect(alert(page)).toHaveCount(0);
});
