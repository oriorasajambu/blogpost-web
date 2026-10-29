import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { test, expect } from '@playwright/test';

const context = JSON.parse(readFileSync('.local/live-public/context.json', 'utf8'));
type Fixture = {
  postId: string;
  slug: string;
  originalSlug: string;
  mediaId: string;
  category: { id: string; slug: string };
  tag: { id: string; slug: string };
  authorHandle: string;
  title: string;
  bodyMarker: string;
  correctionMarker: string;
  draftMarker: string;
  firstPublishedAt: string;
};
const action = (name: string): Fixture =>
  JSON.parse(
    execFileSync(process.execPath, ['test/integration/live-backend.mjs', name], {
      encoding: 'utf8',
      windowsHide: true,
    }),
  );

test('real PostgreSQL publication, private draft, correction, canonical rename and withdrawal', async ({
  page,
  request,
}, testInfo) => {
  let fixture: Fixture = context.fixture;
  const article = () => `/posts/${fixture.slug}`;
  const media = `/media/${fixture.postId}/${fixture.mediaId}/w480`;
  const evidence: string[] = [];
  const html = await request.get(article());
  expect(html.status()).toBe(200);
  expect(html.headers()['cache-control']).toContain('no-store');
  expect(await html.text()).toContain(fixture.bodyMarker);
  await page.goto('/');
  await page.getByRole('link', { name: fixture.title, exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(fixture.title);
  await expect(page.getByText(fixture.bodyMarker, { exact: true })).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    context.webOrigin + article(),
  );
  const original = JSON.parse(await page.locator('script[type="application/ld+json"]').innerText());
  expect(original.datePublished).toBe(fixture.firstPublishedAt);
  const image = await request.get(media);
  expect(image.status()).toBe(200);
  expect(image.headers()['content-type']).toBe('image/png');
  expect(image.headers()['cache-control']).toContain('no-store');
  evidence.push(
    'Clean-artifact published article: initial HTML, navigation, canonical, structured dates and streamed media passed.',
  );

  for (const path of [
    `/categories/${fixture.category.slug}`,
    `/tags/${fixture.tag.slug}`,
    `/authors/${fixture.authorHandle}`,
    `/search?q=curiosity&categoryId=${fixture.category.id}&tagId=${fixture.tag.id}&author=${fixture.authorHandle}`,
  ]) {
    expect((await page.goto(path))?.status()).toBe(200);
    await expect(page.getByRole('link', { name: fixture.title, exact: true })).toBeVisible();
  }
  await page.goto('/search?q=wordswithoutresults');
  await expect(page.getByRole('heading', { name: 'No stories found.' })).toBeVisible();
  evidence.push(
    'SQL-backed category, tag, public author, ranked body search with all filters, and real empty search passed.',
  );

  fixture = action('draft');
  for (const [path, headers] of [
    [article(), {}],
    [article(), { RSC: '1' }],
    ['/', {}],
    ['/search?q=PRIVATE', {}],
  ] as [string, Record<string, string>][]) {
    const response = await request.get(path, { headers });
    expect(response.status()).toBe(200);
    expect(await response.text()).not.toContain(fixture.draftMarker);
  }
  evidence.push(
    'A newer working revision and never-published draft stay out of anonymous HTML, RSC, feed and search.',
  );

  fixture = action('correct');
  await page.goto(article());
  await expect(page.getByText(fixture.correctionMarker, { exact: true })).toBeVisible();
  const corrected = JSON.parse(
    await page.locator('script[type="application/ld+json"]').innerText(),
  );
  expect(corrected.datePublished).toBe(original.datePublished);
  expect(new Date(corrected.dateModified).getTime()).toBeGreaterThan(
    new Date(original.dateModified).getTime(),
  );
  expect(await page.content()).not.toContain(fixture.draftMarker);
  evidence.push(
    'Publishing a correction exposes the new body on the next request and advances dateModified while retaining datePublished.',
  );

  fixture = action('rename');
  const redirect = await request.get(`/posts/${fixture.originalSlug}`, { maxRedirects: 0 });
  expect(redirect.status()).toBe(308);
  expect(new URL(redirect.headers().location, context.webOrigin).pathname).toBe(article());
  expect((await request.get(article(), { maxRedirects: 0 })).status()).toBe(200);
  await page.goto(article());
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    context.webOrigin + article(),
  );
  evidence.push(
    'Real slug-history descriptor emits one 308 to the current published canonical article.',
  );

  fixture = action('withdraw');
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByText(fixture.correctionMarker, { exact: true })).toHaveCount(0);
  for (const path of [article(), `/posts/${fixture.originalSlug}`, media]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status()).toBe(404);
    expect(response.headers()['cache-control']).toContain('no-store');
    expect(await response.text()).not.toContain(fixture.bodyMarker);
  }
  for (const path of ['/', '/search?q=curiosity'])
    expect(await (await request.get(path)).text()).not.toContain(fixture.title);
  evidence.push(
    'Withdrawal removes direct/current/old-slug/media access on the next request, clears feed/search, and removes body on focus return.',
  );
  mkdirSync('.local/live-public', { recursive: true });
  const result = {
    testedAt: new Date().toISOString(),
    backend: {
      sourceSha: context.sourceSha,
      image: context.image,
      authImage: context.authImage,
      runtimeInputDigest: context.runtimeInputDigest,
      sourceInputDigest: context.sourceInputDigest,
      contractStatus: context.contractStatus,
    },
    evidence,
  };
  writeFileSync('.local/live-public/acceptance.json', JSON.stringify(result, null, 2) + '\n');
  await testInfo.attach('real-backend-acceptance', {
    body: JSON.stringify(result, null, 2),
    contentType: 'application/json',
  });
});
