import { test, expect, type APIRequestContext } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const postId = '10000000-0000-4000-8000-000000000001';
const mediaId = '50000000-0000-4000-8000-000000000001';
const articlePath = '/posts/a-reviewed-article';
const mediaPath = `/media/${postId}/${mediaId}/w480`;
async function mode(request: APIRequestContext, value: string) {
  const response = await request.post('http://127.0.0.1:4110/__test/mode', {
    data: { mode: value },
  });
  expect(response.ok()).toBeTruthy();
}

test.beforeEach(async ({ request }) => {
  await mode(request, 'normal');
});
test.afterEach(async ({ request }) => {
  await mode(request, 'normal');
});

test('anonymous readers open a server-rendered article with canonical metadata', async ({
  page,
}) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('link', { name: 'A reviewed article', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'A reviewed article', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'A reviewed article', exact: true }),
  ).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'http://localhost:3100/posts/a-reviewed-article',
  );
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    'content',
    /A reviewed article/,
  );
  await expect(page.getByText('Body text.', { exact: true })).toBeVisible();
});

test('search uses a durable URL, filters, and an explicit empty result', async ({ page }) => {
  await page.goto('/search');
  await page.getByRole('searchbox', { name: 'Search articles' }).fill('reviewed');
  await page
    .getByRole('combobox', { name: 'Category' })
    .selectOption('30000000-0000-4000-8000-000000000001');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page).toHaveURL(/q=reviewed/);
  await expect(page).toHaveURL(/categoryId=30000000/);
  await expect(page.getByRole('link', { name: 'A reviewed article', exact: true })).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search articles' }).fill('no-match');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByRole('link', { name: 'A reviewed article', exact: true })).toHaveCount(0);
  await expect(page.getByRole('main')).toContainText(/no .*|couldn.t find/i);
});

test('author search resolves public handles and preserves recoverable validation feedback', async ({
  page,
}) => {
  await page.goto('/search?q=reviewed');
  await page.getByRole('textbox', { name: 'Author handle' }).fill('synthetic-author');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page).toHaveURL(/author=synthetic-author/);
  await expect(page.getByRole('link', { name: 'A reviewed article', exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Author handle' }).fill('missing-author');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByRole('alert', { name: 'Adjust your search' })).toContainText(
    'couldn’t find an author',
  );
  await expect(page.getByRole('searchbox', { name: 'Search articles' })).toHaveValue('reviewed');
  await page.goto('/search?q=the');
  await expect(page.getByRole('alert', { name: 'Adjust your search' })).toContainText(
    'Try a more specific word or phrase.',
  );
});

for (const [path, heading] of [
  ['/categories/engineering', 'Engineering'],
  ['/tags/learning', 'Learning'],
  ['/authors/synthetic-author', 'Synthetic author'],
]) {
  test(`public collection ${path} shows its published articles`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'A reviewed article', exact: true })).toBeVisible();
  });
}

test('unavailable public content emits a real 404', async ({ request }) => {
  const response = await request.get('/posts/unavailable-article');
  expect(response.status()).toBe(404);
  expect(await response.text()).not.toContain('Body text.');
});

test('a slug-history request emits a single 308 to its published canonical path', async ({
  request,
}) => {
  const response = await request.get('/posts/old-reviewed-article', { maxRedirects: 0 });
  expect(response.status()).toBe(308);
  expect(new URL(response.headers().location, 'http://localhost:3100').pathname).toBe(articlePath);
});

test('outage emits a temporary HTTP error instead of a false missing article or empty feed', async ({
  request,
}) => {
  await mode(request, 'outage');
  for (const path of ['/', articlePath]) {
    const response = await request.get(path);
    expect(response.status()).toBeGreaterThanOrEqual(500);
    expect(response.status()).toBeLessThan(600);
    expect(await response.text()).not.toContain('Body text.');
    expect(response.headers()['cache-control']).toContain('no-store');
  }
});

test('withdrawal removes article, media, and old-slug access on the next request', async ({
  request,
}) => {
  expect((await request.get(articlePath)).status()).toBe(200);
  expect((await request.get(mediaPath)).status()).toBe(200);
  await mode(request, 'withdrawn');
  for (const path of [articlePath, mediaPath, '/posts/old-reviewed-article'])
    expect((await request.get(path, { maxRedirects: 0 })).status()).toBe(404);
});

test('HTML and media are no-store; backend reads include visitor metadata and strip credentials', async ({
  request,
}) => {
  for (const path of ['/', articlePath, mediaPath]) {
    const response = await request.get(path, {
      headers: {
        cookie: 'unrelated_secret=synthetic',
        authorization: 'Bearer synthetic',
        'x-blogpost-web-session': 'synthetic',
      },
    });
    expect(response.status()).toBe(200);
    expect(response.headers()['cache-control']).toContain('no-store');
    expect(response.headers()['content-security-policy']).not.toContain('unsafe-eval');
  }
  const response = await request.get('http://127.0.0.1:4110/__test/requests');
  const calls = (await response.json()) as {
    metadata: Record<string, string | null>;
    hasCookie: boolean;
    hasAuthorization: boolean;
    hasWebSession: boolean;
  }[];
  expect(calls.length).toBeGreaterThan(0);
  for (const call of calls) {
    for (const value of Object.values(call.metadata)) expect(value).toBeTruthy();
    expect(call.metadata['x-device-id']).toMatch(/^[a-f0-9-]{36}$/);
    expect(call.hasCookie || call.hasAuthorization || call.hasWebSession).toBe(false);
  }
});

test('delayed upstream failure still emits a temporary HTTP error before streaming', async ({
  request,
}) => {
  await mode(request, 'slow-outage');
  for (const path of ['/', articlePath]) {
    const response = await request.get(path);
    expect(response.status()).toBeGreaterThanOrEqual(500);
    expect(response.status()).toBeLessThan(600);
    expect(await response.text()).not.toContain('Body text.');
  }
});

test('Markdown never executes raw HTML or fetches arbitrary image URLs', async ({
  page,
  request,
}) => {
  await mode(request, 'malicious');
  const remoteRequests: string[] = [];
  page.on('request', (req) => {
    if (req.url().includes('example.invalid')) remoteRequests.push(req.url());
  });
  await page.goto(articlePath);
  expect(await page.evaluate(() => Reflect.get(window, '__markdownExecuted'))).toBeUndefined();
  await expect(page.locator('a[href^="javascript:"]')).toHaveCount(0);
  await expect(page.locator('img[src^="https:"]')).toHaveCount(0);
  expect(remoteRequests).toEqual([]);
  await expect(page.getByRole('columnheader', { name: 'Name' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy code', exact: true })).toBeVisible();
});

test('explicit theme survives reload and both themes pass automated axe checks', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  await page.goto(articlePath);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
});

test('phone navigation works with the keyboard and content reflows without page overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Open navigation' })).toBeFocused();
  await page.goto(articlePath);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
