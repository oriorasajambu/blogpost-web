import { test, expect, type APIRequestContext } from '@playwright/test';

const articlePath = '/posts/a-reviewed-article';
const fixtureOrigin = 'http://127.0.0.1:4110';
async function mode(request: APIRequestContext, value = 'normal') {
  expect((await request.post(`${fixtureOrigin}/__test/mode`, { data: { mode: value } })).ok()).toBe(
    true,
  );
}
test.beforeEach(async ({ request }) => mode(request));
test.afterEach(async ({ request }) => mode(request));

test('search preserves a full Unicode scalar boundary and explains an overlong query', async ({
  page,
  request,
}) => {
  const query = 'a'.repeat(199) + '😀';
  await page.goto('/search');
  await expect(page.getByRole('searchbox', { name: 'Search articles' })).toHaveAttribute(
    'maxlength',
    '400',
  );
  await page.getByRole('searchbox', { name: 'Search articles' }).fill(query);
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByRole('searchbox', { name: 'Search articles' })).toHaveValue(query);
  const calls = await (await request.get(`${fixtureOrigin}/__test/requests`)).json();
  const call = calls.find((value: { path: string }) => value.path === '/v1/public/search');
  expect(new URLSearchParams(call.query).get('q')).toBe(query);
  await page.goto(`/search?q=${'a'.repeat(201)}`);
  await expect(page.getByRole('alert', { name: 'Adjust your search' })).toContainText(/200/);
  await expect(page.getByRole('searchbox', { name: 'Search articles' })).toHaveValue(
    'a'.repeat(201),
  );
  const after = await (await request.get(`${fixtureOrigin}/__test/requests`)).json();
  expect(
    after.filter((value: { path: string }) => value.path === '/v1/public/search'),
  ).toHaveLength(1);
});

test('an expired feed cursor offers recovery to its collection instead of repeating an outage', async ({
  page,
  request,
}) => {
  await mode(request, 'invalid-cursor');
  for (const path of [
    '/',
    '/categories/engineering',
    '/tags/learning',
    '/authors/synthetic-author',
  ]) {
    expect((await page.goto(`${path}?cursor=expired`))?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: 'This page link has expired.' })).toBeVisible();
    const recovery = page.getByRole('link', { name: 'Back to latest stories' });
    await expect(recovery).toHaveAttribute('href', path);
    await recovery.click();
    await expect(page.getByRole('link', { name: 'A reviewed article', exact: true })).toBeVisible();
  }
});

test('a compatible additive contract minor keeps public reading and media available', async ({
  page,
  request,
}) => {
  await mode(request, 'compatible-minor');
  expect((await page.goto(articlePath))?.status()).toBe(200);
  await expect(page.getByText('Body text.', { exact: true })).toBeVisible();
  const image = await request.get(
    '/media/10000000-0000-4000-8000-000000000001/50000000-0000-4000-8000-000000000001/w480',
  );
  expect(image.status()).toBe(200);
  expect(image.headers()['x-api-contract-version']).toBe('1.1.0');
});

for (const path of [
  '/',
  '/categories/engineering',
  '/tags/learning',
  '/authors/synthetic-author',
]) {
  test(`unique public metadata and static social image on ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `http://localhost:3100${path}`,
    );
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /\S.{15}/);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /\S/);
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', /\S/);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      'content',
      'http://localhost:3100/social.png',
    );
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      'content',
      'summary_large_image',
    );
    await page.goto(`${path}?cursor=synthetic-opaque-cursor`);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `http://localhost:3100${path}`,
    );
  });
}

test('article metadata and body share one read; corrections keep the first publication date', async ({
  page,
  request,
}) => {
  await page.goto(articlePath);
  const calls = await (await request.get(`${fixtureOrigin}/__test/requests`)).json();
  expect(
    calls.filter((call: { path: string }) => call.path.endsWith('/by-slug/a-reviewed-article')),
  ).toHaveLength(1);
  const first = JSON.parse(await page.locator('script[type="application/ld+json"]').innerText());
  expect(first.datePublished).toBe('2026-10-25T08:20:30.123Z');
  await mode(request, 'corrected');
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('A corrected article');
  await expect(page.getByText('A newly published correction.', { exact: true })).toBeVisible();
  const corrected = JSON.parse(
    await page.locator('script[type="application/ld+json"]').innerText(),
  );
  expect(corrected.datePublished).toBe(first.datePublished);
  expect(corrected.dateModified).toBe('2026-10-26T10:00:00.000Z');
  await expect(page.locator('meta[property="article:modified_time"]')).toHaveAttribute(
    'content',
    corrected.dateModified,
  );
  await expect(page.locator('meta[property="og:image"]')).not.toHaveAttribute(
    'content',
    /\/media\//,
  );
});

test('returning to an open article refetches withdrawal instead of retaining the body', async ({
  page,
  request,
}) => {
  await page.goto(articlePath);
  await expect(page.getByText('Body text.', { exact: true })).toBeVisible();
  await mode(request, 'withdrawn');
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByText('Body text.', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/unavailable|found/i);
});

test('taxonomy filters and durable collection URLs include options beyond the first API page', async ({
  page,
  request,
}) => {
  await mode(request, 'taxonomy-pages');
  await page.goto('/search');
  await expect(page.getByRole('combobox', { name: 'Category' }).locator('option')).toHaveCount(52);
  await expect(
    page.getByRole('combobox', { name: 'Tag', exact: true }).locator('option'),
  ).toHaveCount(52);
  for (const path of ['/categories/category-51', '/tags/tag-51']) {
    expect((await page.goto(path))?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/51/);
  }
});

test('cursor pagination requests the next page and preserves collection identity', async ({
  page,
  request,
}) => {
  await mode(request, 'cursor-pages');
  for (const path of [
    '/',
    '/categories/engineering',
    '/tags/learning',
    '/authors/synthetic-author',
  ]) {
    await page.goto(path);
    await page.getByRole('link', { name: 'Older stories' }).click();
    await expect(page).toHaveURL(/cursor=synthetic-next-page/);
    await expect(
      page.getByRole('link', { name: 'Another reviewed article', exact: true }),
    ).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  }
});

test('incompatible responses and an unavailable redirect target remain temporary errors', async ({
  request,
}) => {
  await mode(request, 'invalid-response');
  for (const path of ['/', articlePath, '/search?q=reviewed', '/categories/engineering']) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status()).toBeGreaterThanOrEqual(500);
    expect(response.status()).toBeLessThan(600);
    expect(response.headers()['cache-control']).toContain('no-store');
  }
  await mode(request, 'redirect-outage');
  const response = await request.get('/posts/old-reviewed-article', { maxRedirects: 0 });
  expect(response.status()).toBeGreaterThanOrEqual(500);
  expect(response.headers().location).toBeUndefined();
});

test('HTML, RSC, robots, sitemap and public configuration never acquire shared response caching', async ({
  request,
}) => {
  for (const [path, headers] of [
    [articlePath, {}],
    [articlePath, { RSC: '1' }],
    ['/robots.txt', {}],
    ['/sitemap.xml', {}],
    ['/api/public-config', {}],
  ] as [string, Record<string, string>][]) {
    const response = await request.get(path, { headers });
    expect(response.status()).toBe(200);
    expect(response.headers()['cache-control']).toContain('no-store');
    expect(await response.text()).not.toMatch(
      /PRIVATE_DRAFT_SENTINEL|WEB_CSRF_SECRET|BACKEND_ORIGIN/,
    );
  }
  const calls = await (await request.get(`${fixtureOrigin}/__test/requests`)).json();
  for (const call of calls)
    expect(call.traceparent).toMatch(/^00-[a-f0-9]{32}-[a-f0-9]{16}-[a-f0-9]{2}$/);
});
