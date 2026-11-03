import { mkdir, writeFile } from 'node:fs/promises';
import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const articlePath = '/posts/a-reviewed-article';
const title = 'The art of noticing: a field guide to everyday curiosity';
async function mode(request: APIRequestContext, value = 'reading') {
  const response = await request.post('http://127.0.0.1:4110/__test/mode', {
    data: { mode: value },
  });
  expect(response.ok()).toBeTruthy();
}
async function noPageOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
}
async function colorContrast(page: Page) {
  return page.locator('body').evaluate((body) => {
    function luminance(color: string) {
      const [red, green, blue] = color
        .match(/[\d.]+/g)!
        .slice(0, 3)
        .map(Number)
        .map((value) => {
          const srgb = value / 255;
          return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
        });
      return red * 0.2126 + green * 0.7152 + blue * 0.0722;
    }
    const style = getComputedStyle(body);
    const levels = [luminance(style.color), luminance(style.backgroundColor)].sort((a, b) => b - a);
    return (levels[0] + 0.05) / (levels[1] + 0.05);
  });
}

test.beforeEach(async ({ request }) => {
  await mode(request);
});
test.afterEach(async ({ request }) => {
  await mode(request, 'normal');
});

for (const theme of ['light', 'dark'] as const) {
  for (const device of [
    { name: 'desktop', width: 1920, height: 1080 },
    { name: 'phone', width: 320, height: 800 },
  ]) {
    test(`${device.name} article remains readable and accessible in ${theme} theme`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: device.width, height: device.height });
      await page.emulateMedia({ colorScheme: theme });
      const response = await page.goto(articlePath);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
      await expect(page.locator('main h1')).toHaveCount(1);
      await expect(page.getByRole('heading', { level: 2, name: 'A slower look' })).toBeVisible();
      await expect(
        page.getByRole('heading', { level: 3, name: 'Notice the details' }),
      ).toBeVisible();
      await expect(
        page.getByRole('heading', { level: 4, name: 'Keep the hierarchy' }),
      ).toBeVisible();
      await noPageOverflow(page);
      expect(await colorContrast(page)).toBeGreaterThanOrEqual(4.5);
      if (device.name === 'desktop') {
        // The measure is a CSS ch unit: inspect the computed used width against the actual 0-glyph.
        const measure = await page.locator('.article-body').evaluate((body) => {
          const style = getComputedStyle(body);
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d')!;
          context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
          return body.getBoundingClientRect().width / context.measureText('0').width;
        });
        expect(measure).toBeGreaterThanOrEqual(65);
        expect(measure).toBeLessThanOrEqual(75);
      }
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(results.violations).toEqual([]);
      await mkdir('.local/reading-interface', { recursive: true });
      await page.screenshot({ path: `.local/reading-interface/${device.name}-${theme}.png` });
      await page
        .getByRole('heading', { name: 'Working with a long example' })
        .scrollIntoViewIfNeeded();
      await page.screenshot({
        path: `.local/reading-interface/${device.name}-${theme}-content.png`,
      });
    });
  }
}

test('screen-reader structure exposes landmarks, an ordered heading outline, real table headers, and image alternatives', async ({
  page,
}, testInfo) => {
  await page.goto(articlePath);
  await expect(page.getByRole('banner')).toHaveCount(1);
  await expect(page.getByRole('main')).toHaveCount(1);
  await expect(page.getByRole('contentinfo')).toHaveCount(1);
  await expect(page.getByRole('navigation', { name: 'Utility navigation' })).toHaveCount(1);
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toHaveCount(1);
  await expect(page.getByRole('columnheader')).toHaveCount(6);
  await expect(page.getByRole('columnheader', { name: 'Observation', exact: true })).toBeVisible();
  await expect(
    page.getByRole('img', { name: 'A synthetic green landscape with a warm sun', exact: true }),
  ).toHaveCount(1);
  const informative = page.getByRole('img', {
    name: 'A synthetic green landscape with a warm sun',
    exact: true,
  });
  await informative.scrollIntoViewIfNeeded();
  await expect
    .poll(() => informative.evaluate((image) => (image as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);
  const decorative = page.locator('.article-body img[alt=""]');
  await expect(decorative).toHaveCount(1);
  const outline = await page
    .locator('main h1, main h2, main h3, main h4, main h5, main h6')
    .evaluateAll((headings) => headings.map((heading) => Number(heading.tagName.slice(1))));
  expect(outline[0]).toBe(1);
  for (let index = 1; index < outline.length; index++)
    expect(outline[index]).toBeLessThanOrEqual(outline[index - 1] + 1);
  const accessibilityTree = await page.locator('body').ariaSnapshot();
  expect(accessibilityTree).toContain(
    'heading "The art of noticing: a field guide to everyday curiosity" [level=1]',
  );
  expect(accessibilityTree).toContain('columnheader "Observation"');
  expect(accessibilityTree).toContain('region "Scrollable article table"');
  await mkdir('.local/reading-interface', { recursive: true });
  await writeFile('.local/reading-interface/accessibility-tree.yml', accessibilityTree);
  await testInfo.attach('reading-accessibility-tree', {
    body: accessibilityTree,
    contentType: 'text/plain',
  });
});

test('a valid empty publication has a clear reading state and no invented articles', async ({
  page,
  request,
}) => {
  await mode(request, 'empty');
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Make room for a new perspective.' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 2, name: 'The next story starts here.' }),
  ).toBeVisible();
  await expect(page.getByRole('main')).toContainText('There are no published articles yet.');
  await expect(page.locator('main article')).toHaveCount(0);
  await expect(page.getByRole('alert', { name: 'Adjust your search' })).toHaveCount(0);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
});

test('keyboard readers can skip navigation, operate the phone disclosure, and scroll wide content without moving the page', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto(articlePath);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  const menu = page.getByRole('button', { name: 'Open navigation', exact: true });
  await menu.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Latest', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toBeFocused();
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeHidden();
  for (const region of [
    page.locator('pre[aria-label="typescript code"]'),
    page.getByRole('region', { name: 'Scrollable article table' }),
  ]) {
    await region.scrollIntoViewIfNeeded();
    await expect(region).toHaveAttribute('tabindex', '0');
    expect(await region.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(
      true,
    );
    await region.focus();
    await page.keyboard.press('ArrowRight');
    const focusRing = await region.evaluate((element) => {
      const style = getComputedStyle(element);
      return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
    });
    expect(focusRing.style).not.toBe('none');
    expect(focusRing.width).toBeGreaterThanOrEqual(2);
    await expect.poll(() => region.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
    await noPageOverflow(page);
  }
});

test('clipboard denial leaves visible recovery guidance and keyboard focus on the copy control', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: () => Promise.reject(new DOMException('Clipboard denied', 'NotAllowedError')),
      },
    });
  });
  await page.goto(articlePath);
  const copy = page.getByRole('button', { name: 'Copy code', exact: true });
  await copy.focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByText('Copy unavailable. Select the code to copy it.', { exact: true }),
  ).toBeVisible();
  await expect(copy).toBeFocused();
  await expect(page.locator('.code-block [role="status"]')).toContainText('Copy unavailable');
});

test('keyboard copying writes the complete code sample and announces success', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
    origin: 'http://localhost:3100',
  });
  await page.goto(articlePath);
  const code = await page.locator('pre[aria-label="typescript code"] code').textContent();
  const copy = page.getByRole('button', { name: 'Copy code', exact: true });
  await copy.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.code-block [role="status"]')).toHaveText('Code copied.');
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  // The Windows clipboard normalizes LF to CRLF; preserve text rather than asserting OS separators.
  expect(copied.replace(/\r\n/g, '\n')).toBe(code);
  await expect(copy).toBeFocused();
});

test('maximum-length category labels remain readable without page overflow', async ({
  page,
  request,
}) => {
  await mode(request, 'reading-long-labels');
  for (const width of [320, 768, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const menu = page.getByRole('button', { name: 'Open navigation', exact: true });
    if (await menu.isVisible()) await menu.click();
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'W'.repeat(80), exact: true })).toBeVisible();
    await noPageOverflow(page);
    for (const link of await page.locator('.primary-nav a').all()) {
      const bounds = await link.boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    }
  }
});

test('unavailable informative media has an accessible alternative and the rest of the article remains readable', async ({
  page,
}) => {
  await page.goto(articlePath);
  await page
    .getByRole('heading', { name: 'When an image is unavailable' })
    .scrollIntoViewIfNeeded();
  const missing = page.getByRole('img', {
    name: /An unavailable field-notes diagram.*unavailable|unavailable.*An unavailable field-notes diagram/i,
  });
  await expect(missing).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Leave a little room' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'latest stories', exact: true })).toBeVisible();
});

test('a saved override wins before hydration and system dark mode works when storage is unavailable', async ({
  browser,
}) => {
  const override = await browser.newContext({
    colorScheme: 'dark',
    viewport: { width: 1280, height: 800 },
  });
  await override.addInitScript(() => localStorage.setItem('blogpost-theme', 'light'));
  const first = await override.newPage();
  // Pause framework scripts while the small head bootstrap and CSS can run.
  await first.route('**/_next/static/**/*.js', (route) => route.abort());
  await first.goto(articlePath);
  await expect(first.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(
    await first.locator('html').evaluate((element) => getComputedStyle(element).colorScheme),
  ).toBe('light');
  await override.close();

  const unavailable = await browser.newContext({
    colorScheme: 'dark',
    viewport: { width: 390, height: 844 },
  });
  await unavailable.addInitScript(() => {
    Object.defineProperty(Storage.prototype, 'getItem', {
      configurable: true,
      value: () => {
        throw new DOMException('Storage unavailable', 'SecurityError');
      },
    });
    Object.defineProperty(Storage.prototype, 'setItem', {
      configurable: true,
      value: () => {
        throw new DOMException('Storage unavailable', 'SecurityError');
      },
    });
  });
  const second = await unavailable.newPage();
  await second.goto(articlePath);
  await expect(second.getByRole('button', { name: 'Switch to light theme' })).toBeVisible();
  expect(
    await second.locator('html').evaluate((element) => getComputedStyle(element).colorScheme),
  ).toBe('dark');
  await second.getByRole('button', { name: 'Switch to light theme' }).click();
  await expect(second.locator('html')).toHaveAttribute('data-theme', 'light');
  await second.reload();
  expect(
    await second.locator('html').evaluate((element) => getComputedStyle(element).colorScheme),
  ).toBe('dark');
  await unavailable.close();
});

test('200 percent text scaling and 400 percent equivalent reflow retain controls and article content', async ({
  page,
}) => {
  await page.setViewportSize({ width: 640, height: 900 });
  await page.goto(articlePath);
  // Browser text-only scaling is distinct from shrinking the viewport.
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  await noPageOverflow(page);
  const scrollCode = page.locator('pre[aria-label="typescript code"]');
  await scrollCode.scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: 'Copy code', exact: true })).toBeVisible();
  await noPageOverflow(page);
  await page.reload();
  // 1280 CSS px at 400% browser zoom provides a 320 CSS px layout viewport.
  await page.setViewportSize({ width: 320, height: 800 });
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  await noPageOverflow(page);
});

test('reduced-motion readers receive immediate scrolling and delayed navigation announces loading', async ({
  page,
  request,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  expect(
    await page.locator('html').evaluate((element) => getComputedStyle(element).scrollBehavior),
  ).toBe('auto');
  await mode(request, 'reading-delay');
  await page.getByRole('link', { name: title, exact: true }).click({ noWaitAfter: true });
  await expect(page.getByRole('status', { name: 'Loading page' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeFocused();
  await expect(page.getByRole('status', { name: 'Loading page' })).toHaveCount(0);
});

test('a temporary article failure recovers through Try again after the API returns', async ({
  page,
  request,
}) => {
  await mode(request, 'reading-delay-outage');
  const response = await page.goto(articlePath);
  expect(response?.status()).toBeGreaterThanOrEqual(500);
  expect(response?.status()).toBeLessThan(600);
  await expect(
    page.getByRole('heading', { level: 1, name: 'The journal is temporarily unavailable.' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: title })).toHaveCount(0);
  await mode(request, 'reading');
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try again', exact: true })).toHaveCount(0);
});
