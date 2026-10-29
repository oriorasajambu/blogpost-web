import { test, expect } from '@playwright/test';
const article = '/posts/a-reviewed-article';
const fixtureOrigin = 'http://127.0.0.1:4110';
test.beforeEach(async ({ request }) => {
  await request.post(`${fixtureOrigin}/__test/mode`, { data: { mode: 'normal' } });
});

test('production robots and sitemap expose only current public canonical content', async ({
  request,
}) => {
  const robots = await request.get('/robots.txt');
  expect(robots.status()).toBe(200);
  expect(robots.headers()['x-robots-tag']).toBeUndefined();
  const rules = await robots.text();
  for (const path of ['/studio', '/invite', '/sign-in', '/search', '/api/'])
    expect(rules).toContain(`Disallow: ${path}`);
  expect(rules).toContain('Sitemap: https://publication.blogpost.test/sitemap.xml');
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.status()).toBe(200);
  expect(sitemap.headers()['cache-control']).toContain('no-store');
  const xml = await sitemap.text();
  for (const path of [
    article,
    '/categories/engineering',
    '/tags/learning',
    '/authors/synthetic-author',
  ])
    expect(xml).toContain(`https://publication.blogpost.test${path}`);
  expect(xml).not.toMatch(/old-reviewed|\/studio|\/search|\/sign-in|\/invite/);
  await request.post(`${fixtureOrigin}/__test/mode`, { data: { mode: 'withdrawn' } });
  expect(await (await request.get('/sitemap.xml')).text()).not.toContain(article);
  expect((await request.get(article)).status()).toBe(404);
});

test('production sitemap follows API cursors and fails temporarily during an outage', async ({
  request,
}) => {
  await request.post(`${fixtureOrigin}/__test/mode`, { data: { mode: 'cursor-pages' } });
  const response = await request.get('/sitemap.xml');
  expect(response.status()).toBe(200);
  const xml = await response.text();
  expect(xml).toContain('/posts/a-reviewed-article');
  expect(xml).toContain('/posts/another-reviewed-article');
  expect(
    xml.match(/<loc>https:\/\/publication.blogpost.test\/categories\/engineering<\/loc>/g),
  ).toHaveLength(1);
  await request.post(`${fixtureOrigin}/__test/mode`, { data: { mode: 'outage' } });
  const failed = await request.get('/sitemap.xml');
  expect(failed.status()).toBeGreaterThanOrEqual(500);
  expect(failed.headers()['cache-control']).toContain('no-store');
});

test('configured origin controls canonical and social URLs independently of incoming Host', async ({
  page,
  request,
}) => {
  await page.goto(article);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    `https://publication.blogpost.test${article}`,
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    'https://publication.blogpost.test/social.png',
  );
  const html = await (
    await request.get(article, {
      headers: { host: 'attacker.invalid', 'x-forwarded-host': 'attacker.invalid' },
    })
  ).text();
  expect(html).toContain(`https://publication.blogpost.test${article}`);
  expect(html).not.toContain('https://attacker.invalid');
});

test('staging is visibly labelled and entirely excluded from indexing', async ({
  page,
  request,
}) => {
  const origin = 'http://127.0.0.1:3103';
  await page.goto(`${origin}${article}`);
  await expect(page.getByText(/staging/i).first()).toBeVisible();
  for (const path of [article, '/robots.txt', '/sitemap.xml']) {
    const response = await request.get(`${origin}${path}`);
    expect(response.headers()['x-robots-tag']).toContain('noindex');
    if (path === '/robots.txt') expect(await response.text()).toContain('Disallow: /');
    if (path === '/sitemap.xml') expect(await response.text()).not.toContain('<loc>');
  }
});

test('origin-free bootstrap omits absolute canonical/social URLs and never adopts Host', async ({
  page,
  request,
}) => {
  const origin = 'http://127.0.0.1:3104';
  await page.goto(`${origin}${article}`);
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  await expect(page.locator('meta[property="og:url"], meta[property="og:image"]')).toHaveCount(0);
  const html = await (
    await request.get(`${origin}${article}`, { headers: { host: 'attacker.invalid' } })
  ).text();
  expect(html).not.toContain('http://attacker.invalid');
  expect(html).not.toContain('https://attacker.invalid');
  expect(await (await request.get(`${origin}/sitemap.xml`)).text()).not.toContain('<loc>');
});
