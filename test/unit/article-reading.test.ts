import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Markdown } from '../../src/components/article/markdown';
import { CodeBlock } from '../../src/components/article/code-block';
import { ArticleSkeleton } from '../../src/components/article/article-skeleton';
import { mediaSources } from '../../src/lib/markdown';

const postId = '10000000-0000-4000-8000-000000000001';
const mediaId = '50000000-0000-4000-8000-000000000001';
const render = (source: string) =>
  renderToStaticMarkup(createElement(Markdown, { source, postId }));

test('article body reserves h1 for the page title and closes skipped heading levels', () => {
  const html = render(
    '# First section\n\n#### A deeply nested section\n\n## Another subsection\n\n# Last section',
  );
  assert.ok(html.includes('<h2 id="section-first-section" tabindex="-1">First section</h2>'));
  assert.ok(
    html.includes(
      '<h3 id="section-a-deeply-nested-section" tabindex="-1">A deeply nested section</h3>',
    ),
  );
  assert.ok(
    html.includes('<h3 id="section-another-subsection" tabindex="-1">Another subsection</h3>'),
  );
  assert.ok(html.includes('<h2 id="section-last-section" tabindex="-1">Last section</h2>'));
  assert.doesNotMatch(html, /<h1|<h4/);
});

test('section targets are deterministic, unique, and include visible inline heading text', () => {
  const html = render(
    '### Café & **tea**\n\n### Café & **tea**\n\n# Return to the root\n\n### A child',
  );
  assert.ok(html.includes('id="section-cafe-tea"'));
  assert.ok(html.includes('id="section-cafe-tea-2"'));
  assert.ok(html.includes('<h2 id="section-return-to-the-root"'));
  assert.ok(html.includes('<h3 id="section-a-child"'));
});

test('natural numeric section names cannot collide with generated duplicate suffixes', () => {
  const html = render('# Notes\n\n# Notes\n\n# Notes 2\n\n# Notes');
  const identifiers = [...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(identifiers.length, 4);
  assert.equal(new Set(identifiers).size, 4);
  assert.deepEqual(identifiers, [
    'section-notes',
    'section-notes-2',
    'section-notes-2-2',
    'section-notes-3',
  ]);
});

test('empty source headings do not become empty screen-reader headings', () => {
  const html = render('#\n\n### A readable section');
  assert.doesNotMatch(html, /<h[1-6][^>]*><\/h[1-6]>/);
  assert.match(html, /<h2[^>]*>A readable section<\/h2>/);
});

test('responsive media uses only approved same-origin variants and deduplicates real widths', () => {
  const sources = mediaSources(postId, {
    mediaId,
    variants: [
      { name: 'w1600', width: 800 },
      { name: 'w480', width: 480 },
      { name: 'w960', width: 800 },
      { name: 'constructor', width: 400 },
      { name: 'remote', width: 300 },
      { name: 'w480', width: 900 },
    ],
  });
  assert.equal(
    sources,
    `/media/${postId}/${mediaId}/w480 480w, /media/${postId}/${mediaId}/w1600 800w`,
  );
  assert.equal(
    mediaSources('../other', { mediaId, variants: [{ name: 'w480', width: 480 }] }),
    undefined,
  );
  assert.equal(
    mediaSources(postId, { mediaId, variants: [{ name: 'w480', width: 0 }] }),
    undefined,
  );
});

test('Markdown images retain intrinsic dimensions and actual responsive candidates', () => {
  const html = renderToStaticMarkup(
    createElement(Markdown, {
      source: `![A useful diagram](media://${mediaId})`,
      postId,
      media: [
        {
          mediaId,
          width: 1200,
          height: 800,
          variants: [
            { name: 'w480', width: 480 },
            { name: 'w960', width: 960 },
            { name: 'w1600', width: 1200 },
          ],
        },
      ],
    }),
  );
  assert.ok(html.includes('width="1200" height="800"'));
  assert.match(html, /srcSet="[^\"]*w480 480w, [^\"]*w960 960w, [^\"]*w1600 1200w"/i);
  assert.doesNotMatch(html, /_next\/image/);
});

test('an empty image alt is accepted only when the source explicitly marks it decorative', () => {
  const media = [{ mediaId, width: 100, height: 50 }];
  const missing = renderToStaticMarkup(
    createElement(Markdown, { source: `![](media://${mediaId})`, postId, media }),
  );
  const decorative = renderToStaticMarkup(
    createElement(Markdown, { source: `![](media://${mediaId} "decorative")`, postId, media }),
  );
  assert.doesNotMatch(missing, /<img/);
  assert.match(decorative, /<img[^>]*alt=""/);
  const whitespace = renderToStaticMarkup(
    createElement(Markdown, { source: `![   ](media://${mediaId} "decorative")`, postId, media }),
  );
  assert.match(whitespace, /<img[^>]*alt=""/);
});

test('code regions have a persistent copy control and bounded readable language label', () => {
  const html = renderToStaticMarkup(
    createElement(CodeBlock, { source: 'a very long line', language: 'typescript' }),
  );
  const identifier = /<pre id="([^\"]+)"/.exec(html)?.[1];
  assert.ok(identifier);
  assert.ok(html.includes(`aria-controls="${identifier}"`));
  assert.ok(html.includes('role="region" tabindex="0" aria-label="typescript code"'));
  assert.ok(html.includes('Copy code'));
  const unknown = renderToStaticMarkup(
    createElement(CodeBlock, { source: 'safe', language: 'x'.repeat(200) }),
  );
  assert.ok(unknown.includes('Plain text code'));
  assert.ok(!unknown.includes('x'.repeat(200)));
});

test('the pending-page skeleton can remain silent under the shared loading announcement', () => {
  const announced = renderToStaticMarkup(createElement(ArticleSkeleton));
  const silent = renderToStaticMarkup(createElement(ArticleSkeleton, { announce: false }));
  assert.ok(announced.includes('role="status"'));
  assert.ok(silent.includes('aria-hidden="true"'));
  assert.doesNotMatch(silent, /role="status"|Loading articles/);
});
