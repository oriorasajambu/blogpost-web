import { randomUUID } from 'node:crypto';
import { test, expect, login, staffMutation, stack } from './staff-test-helpers';
import { startMetadataHarness } from './staff-meta-harness.mjs';

test('fresh server metadata blocks staff mutations for required updates, retirement, incompatibility and outage without losing the proposal', async ({
  browser,
}) => {
  test.setTimeout(150_000);
  const harness = await startMetadataHarness(stack);
  try {
    const author = await login(browser, 'author', {
      webOrigin: harness.origin,
      namespace: harness.namespace,
    });
    const response = await author.session.request.get('/api/editorial/me');
    expect(response.status()).toBe(200);
    const original = (await response.json()).data;
    const proposal = `Metadata proposal ${randomUUID()}`;
    const input = {
      method: 'PATCH',
      version: original.version,
      key: randomUUID(),
      webOrigin: harness.origin,
      content: { displayName: proposal, bio: original.bio },
    };
    const before = harness.forwardedWrites();
    await author.page.goto('/studio/profile');
    await author.page.getByLabel('Display name', { exact: true }).fill(proposal);
    harness.setMode('minimum');
    await author.page.getByRole('button', { name: 'Save public profile', exact: true }).click();
    await expect(author.page.locator('.staff-error[role="alert"]')).toContainText(
      'Update this application',
    );
    await expect(author.page.getByLabel('Display name', { exact: true })).toHaveValue(proposal);
    for (const [mode, status, code] of [
      ['minimum', 426, 'CLIENT_UPDATE_REQUIRED'],
      ['retired', 426, 'CLIENT_UPDATE_REQUIRED'],
      ['incompatible', 502, 'INVALID_API_RESPONSE'],
      ['outage', 503, 'DEPENDENCY_UNAVAILABLE'],
    ] as const) {
      harness.setMode(mode);
      const result = await staffMutation(author.session, '/me', input);
      expect(result.response.status()).toBe(status);
      expect(result.body.error.code).toBe(code);
      expect(result.response.headers()['cache-control']).toContain('no-store');
      const actual = await author.session.request.get('/api/editorial/me');
      expect((await actual.json()).data).toEqual(original);
      expect(harness.forwardedWrites()).toBe(before);
    }
    harness.setMode('normal');
    const recovered = await staffMutation(author.session, '/me', input);
    expect(recovered.response.status()).toBe(200);
    expect(recovered.body.data.version).toBe(original.version + 1);
    expect(recovered.body.data.displayName).toBe(proposal);
    expect(harness.forwardedWrites()).toBe(before + 1);
    const restored = await staffMutation(author.session, '/me', {
      ...input,
      key: randomUUID(),
      version: recovered.body.data.version,
      content: { displayName: original.displayName, bio: original.bio },
    });
    expect(restored.response.status()).toBe(200);
  } finally {
    await harness.stop();
  }
});
