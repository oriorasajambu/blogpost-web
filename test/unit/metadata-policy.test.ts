import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { components } from '../../src/lib/api-types';
import {
  articleStructuredData,
  publicationMetadata,
  publishedDiscoveryEntries,
  scriptJson,
} from '../../src/lib/metadata-policy';

const origin = 'https://journal.example.test';
const envelope = JSON.parse(
  readFileSync(
    new URL('../../contracts/fixtures/operations/getPublicPost.response.json', import.meta.url),
    'utf8',
  ),
) as components['schemas']['GetPublicPostEnvelope'];
const post = envelope.data;

test('article discovery uses canonical public fields and a static brand image across social networks', () => {
  const metadata = publicationMetadata({
    title: post.title,
    description: post.summary,
    path: `/posts/${post.slug}`,
    origin,
    article: {
      publishedTime: post.firstPublishedAt,
      modifiedTime: post.updatedAt,
      author: post.author.displayName,
    },
  });
  assert.deepEqual(metadata.alternates, { canonical: `${origin}/posts/${post.slug}` });
  const serialized = JSON.stringify(metadata);
  assert.ok(serialized.includes(`${origin}/social.png`));
  assert.ok(serialized.includes('summary_large_image'));
  assert.ok(serialized.includes(post.firstPublishedAt));
  assert.ok(serialized.includes(post.updatedAt));
  assert.doesNotMatch(serialized, /\/media\/|media:\/\//);
});

test('originless public startup omits every absolute discovery URL', () => {
  const metadata = publicationMetadata({
    title: post.title,
    description: post.summary,
    path: `/posts/${post.slug}`,
  });
  assert.equal(metadata.alternates, undefined);
  assert.ok(metadata.twitter && 'card' in metadata.twitter);
  assert.equal(metadata.twitter.card, 'summary');
  assert.doesNotMatch(JSON.stringify(metadata), /https?:|\/social\./);
  const structured = articleStructuredData(post);
  assert.equal('url' in structured, false);
  assert.equal('url' in structured.author, false);
  assert.equal('mainEntityOfPage' in structured, false);
});

test('structured data preserves first publication independently of a correction timestamp', () => {
  const corrected = {
    ...post,
    firstPublishedAt: '2026-01-02T03:04:05.000Z',
    updatedAt: '2026-10-29T04:05:06.000Z',
  };
  const structured = articleStructuredData(corrected, origin);
  assert.equal(structured.datePublished, corrected.firstPublishedAt);
  assert.equal(structured.dateModified, corrected.updatedAt);
  assert.equal(structured.mainEntityOfPage, `${origin}/posts/${post.slug}`);
  assert.equal(structured.author.url, `${origin}/authors/${post.author.handle}`);
});

test('article text cannot break out of its structured-data script', () => {
  const headline = '</script><script>alert("untrusted")</script> & curiosity';
  const serialized = scriptJson(articleStructuredData({ ...post, title: headline }, origin));
  assert.doesNotMatch(serialized, /<\/script|<script/);
  assert.equal(JSON.parse(serialized).headline, headline);
});

test('discovery entries include only published evidence and deduplicate collections and profiles', () => {
  assert.deepEqual(publishedDiscoveryEntries([], origin), []);
  const second = { ...post, id: '10000000-0000-4000-8000-000000000002', slug: 'second-story' };
  const entries = publishedDiscoveryEntries([post, second], origin);
  const urls = entries.map((entry) => entry.url);
  assert.equal(new Set(urls).size, urls.length);
  assert.ok(urls.includes(`${origin}/posts/${post.slug}`));
  assert.ok(urls.includes(`${origin}/posts/second-story`));
  assert.ok(urls.includes(`${origin}/categories/${post.category.slug}`));
  assert.ok(urls.includes(`${origin}/authors/${post.author.handle}`));
  for (const tag of post.tags) assert.ok(urls.includes(`${origin}/tags/${tag.slug}`));
  assert.ok(urls.every((url) => !/\/studio|\/search|\/invite|\/sign-in|\/media/.test(url)));
  assert.equal(
    entries.find((entry) => entry.url === `${origin}/posts/${post.slug}`)?.lastModified,
    post.updatedAt,
  );
});
