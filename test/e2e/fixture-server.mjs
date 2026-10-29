// Test process only. The application never imports this server or falls back to it.
import http from 'node:http';
import https from 'node:https';
import { readFileSync } from 'node:fs';
import {
  applyReadingArticle,
  applyReadingSummary,
  decorativeMediaId,
  readingImages,
  readingMediaId,
} from './reading-fixtures.mjs';

const fixture = (name) =>
  JSON.parse(
    readFileSync(
      new URL(`../../contracts/fixtures/operations/${name}.response.json`, import.meta.url),
      'utf8',
    ),
  );
const errorFixture = (name) =>
  JSON.parse(
    readFileSync(new URL(`../../contracts/fixtures/errors/${name}.json`, import.meta.url), 'utf8'),
  );
const postId = '10000000-0000-4000-8000-000000000001';
const mediaId = '50000000-0000-4000-8000-000000000001';
const traceId = '4bf92f3577b34da6a3ce929d0e0e4736';
const image = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
  'base64',
);
let mode = 'normal';
let requests = [];
const isReading = () => ['reading', 'reading-delay', 'reading-long-labels'].includes(mode);
const contractVersion = () => (mode === 'compatible-minor' ? '1.1.0' : '1.0.0');

function send(res, status, body) {
  if (body.meta) body.meta.contractVersion = contractVersion();
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-trace-id': traceId,
    'x-api-contract-version': contractVersion(),
  });
  res.end(JSON.stringify(body));
}
function missing(res) {
  return send(res, 404, errorFixture('resource-not-found'));
}
function page(body, url) {
  const p = body.meta.pagination;
  if (p?.kind === 'PAGE') {
    p.page = Number(url.searchParams.get('page') || '1');
    if (p.page > 1) body.data = [];
    p.hasMore = p.page < p.totalPages;
  }
  if (p && url.searchParams.has('pageSize')) p.pageSize = Number(url.searchParams.get('pageSize'));
  return body;
}
function article() {
  const body = fixture('resolvePublicPostSlug');
  if (isReading()) body.data.post = applyReadingArticle(body.data.post);
  if (mode === 'corrected') {
    body.data.post.title = 'A corrected article';
    body.data.post.markdown = 'A newly published correction.';
    body.data.post.updatedAt = '2026-10-26T10:00:00.000Z';
    body.data.post.publishedRevisionId = '20000000-0000-4000-8000-000000000003';
  }
  if (mode === 'malicious')
    body.data.post.markdown =
      '## A safe heading\n\n<script>window.__markdownExecuted = true</script>\n\n[Unsafe link](javascript:alert(1))\n\n![Remote image](https://example.invalid/tracker.png)\n\n```typescript\nconst answer = 42;\n```\n\n| Name | Value |\n| --- | --- |\n| One | Two |';
  return body;
}

const handler = async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:4110');
  if (url.pathname === '/__test/health') return send(res, 200, { ready: true });
  if (url.pathname === '/__test/mode' && req.method === 'POST') {
    let raw = '';
    for await (const chunk of req) {
      raw += chunk;
      if (raw.length > 1024) return send(res, 413, {});
    }
    const requested = JSON.parse(raw || '{}').mode;
    if (
      ![
        'normal',
        'outage',
        'slow-outage',
        'withdrawn',
        'empty',
        'malicious',
        'reading',
        'reading-delay',
        'reading-delay-outage',
        'reading-long-labels',
        'corrected',
        'taxonomy-pages',
        'cursor-pages',
        'invalid-response',
        'redirect-outage',
        'compatible-minor',
        'invalid-cursor',
      ].includes(requested)
    )
      return send(res, 400, { error: 'Unknown test mode' });
    mode = requested;
    requests = [];
    return send(res, 200, { mode });
  }
  if (url.pathname === '/__test/requests') return send(res, 200, requests);
  if (!url.pathname.startsWith('/v1/')) return missing(res);
  requests.push({
    path: url.pathname,
    query: url.search,
    metadata: Object.fromEntries(
      ['x-device-id', 'x-device-os', 'x-device-version', 'x-app-version', 'x-app-language'].map(
        (key) => [key, req.headers[key] ?? null],
      ),
    ),
    hasCookie: !!req.headers.cookie,
    hasAuthorization: !!req.headers.authorization,
    hasWebSession: !!req.headers['x-blogpost-web-session'],
    traceparent: req.headers.traceparent ?? null,
  });
  if (requests.length > 500) requests.shift();
  if (mode === 'outage') return send(res, 503, errorFixture('dependency-unavailable'));
  if (mode === 'invalid-response') return send(res, 200, { invalid: true });
  if (mode === 'redirect-outage' && url.pathname === '/v1/public/posts/by-slug/a-reviewed-article')
    return send(res, 503, errorFixture('dependency-unavailable'));
  if (mode === 'slow-outage' && !url.pathname.endsWith('/categories')) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return send(res, 503, errorFixture('dependency-unavailable'));
  }
  if (mode === 'reading-delay-outage' && !url.pathname.endsWith('/categories')) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return send(res, 503, errorFixture('dependency-unavailable'));
  }
  if (mode === 'reading-delay' && url.pathname.includes('/posts/by-slug/')) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  if (url.pathname === '/v1/public/categories') {
    const body = fixture('listPublicCategories');
    if (mode === 'taxonomy-pages') return taxonomyPage(body, url, 'category', res);
    if (mode === 'reading-long-labels') {
      const original = body.data[0];
      body.data = [
        original,
        ...Array.from({ length: 5 }, (_, index) => ({
          ...original,
          id: `30000000-0000-4000-8000-00000000001${index}`,
          slug: `a-long-category-${index}`,
          name: index === 0 ? 'W'.repeat(80) : `A thoughtful category with a longer name ${index}`,
        })),
      ];
      body.meta.pagination.totalItems = body.data.length;
    }
    return send(res, 200, page(body, url));
  }
  if (url.pathname === '/v1/public/tags') {
    const body = fixture('listPublicTags');
    if (mode === 'taxonomy-pages') return taxonomyPage(body, url, 'tag', res);
    return send(res, 200, page(body, url));
  }
  if (url.pathname === '/v1/public/authors/synthetic-author')
    return send(res, 200, fixture('getPublicAuthor'));
  if (url.pathname === '/v1/public/posts' || url.pathname === '/v1/public/search') {
    if (mode === 'invalid-cursor' && url.searchParams.has('cursor')) {
      const error = errorFixture('resource-not-found');
      error.statusCode = 400;
      error.error.code = 'INVALID_CURSOR';
      return send(res, 400, error);
    }
    const search = url.pathname.endsWith('/search');
    const body = fixture(search ? 'searchPublicPosts' : 'listPublicPosts');
    if (isReading()) body.data = body.data.map(applyReadingSummary);
    const source = body.data[0];
    if (!search && mode === 'cursor-pages') {
      if (url.searchParams.has('cursor')) {
        body.data[0] = {
          ...source,
          id: '10000000-0000-4000-8000-000000000002',
          slug: 'another-reviewed-article',
          title: 'Another reviewed article',
          cover: null,
        };
      } else {
        body.meta.pagination.hasMore = true;
        body.meta.pagination.nextCursor = 'synthetic-next-page';
      }
    }
    const query = url.searchParams.get('q')?.trim().toLowerCase();
    if (search && query === 'the') {
      const error = errorFixture('resource-not-found');
      error.statusCode = 422;
      error.error.code = 'SEARCH_QUERY_NOT_SEARCHABLE';
      return send(res, 422, error);
    }
    const category = url.searchParams.get('categoryId');
    const author = url.searchParams.get('authorId');
    const tags = url.searchParams.getAll('tagIds');
    if (
      mode === 'empty' ||
      mode === 'withdrawn' ||
      (search && query && !`${source.title} ${source.summary}`.toLowerCase().includes(query)) ||
      (category && category !== source.category.id) ||
      (author && author !== source.author.id) ||
      tags.some((id) => !source.tags.some((tag) => tag.id === id))
    ) {
      body.data = [];
      if (body.meta.pagination.kind === 'PAGE') {
        body.meta.pagination.totalItems = 0;
        body.meta.pagination.totalPages = 0;
      }
    }
    return send(res, 200, page(body, url));
  }
  if (url.pathname === '/v1/public/posts/availability') {
    const body = fixture('listPublicPosts');
    body.meta.pagination = null;
    body.data = [
      {
        postId,
        available: mode !== 'withdrawn',
        publishedRevisionId: mode === 'withdrawn' ? null : '20000000-0000-4000-8000-000000000002',
      },
    ];
    return send(res, 200, body);
  }
  if (url.pathname === '/v1/public/posts/by-slug/a-reviewed-article')
    return mode === 'withdrawn' ? missing(res) : send(res, 200, article());
  if (url.pathname === '/v1/public/posts/by-slug/old-reviewed-article') {
    if (mode === 'withdrawn') return missing(res);
    const body = article();
    body.data.resolution = 'REDIRECT';
    body.data.post = null;
    return send(res, 200, body);
  }
  if (url.pathname === `/v1/public/posts/${postId}`) {
    if (mode === 'withdrawn') return missing(res);
    const body = fixture('getPublicPost');
    body.data = article().data.post;
    return send(res, 200, body);
  }
  if (
    isReading() &&
    new RegExp(
      `^/v1/public/posts/${postId}/media/(${readingMediaId}|${decorativeMediaId})/(w480|w960|w1600)$`,
    ).test(url.pathname)
  ) {
    const name = url.pathname.split('/').at(-1);
    const asset = readingImages.get(name);
    res.writeHead(200, {
      'content-type': 'image/png',
      'cache-control': 'no-store',
      'content-length': asset.bytes.length,
      'x-trace-id': traceId,
      'x-api-contract-version': contractVersion(),
    });
    return res.end(asset.bytes);
  }
  if (
    new RegExp(`^/v1/public/posts/${postId}/media/${mediaId}/(w480|w960|w1600)$`).test(url.pathname)
  ) {
    if (mode === 'withdrawn') return missing(res);
    res.writeHead(200, {
      'content-type': 'image/png',
      'cache-control': 'no-store',
      'content-length': image.length,
      'x-trace-id': traceId,
      'x-api-contract-version': contractVersion(),
    });
    return res.end(image);
  }
  return missing(res);
};

function taxonomyPage(body, url, kind, res) {
  const size = Number(url.searchParams.get('pageSize') || '50');
  const number = Number(url.searchParams.get('page') || '1');
  const first = body.data[0];
  body.data = Array.from({ length: 51 }, (_, index) => ({
    ...first,
    id: `30000000-0000-4000-8000-${String(index + (kind === 'tag' ? 100 : 1)).padStart(12, '0')}`,
    name: `${kind === 'tag' ? 'Tag' : 'Category'} ${index + 1}`,
    slug: `${kind}-${index + 1}`,
  })).slice((number - 1) * size, number * size);
  body.meta.pagination = {
    kind: 'PAGE',
    page: number,
    pageSize: size,
    totalItems: 51,
    totalPages: Math.ceil(51 / size),
    hasMore: number < Math.ceil(51 / size),
    truncated: false,
  };
  return send(res, 200, body);
}

// Share the same deterministic HTTP handler with the environment test's trusted TLS listener.
const server = http.createServer(handler);

server.listen(4110, '127.0.0.1', () =>
  console.log('E2E contract fixtures ready at http://127.0.0.1:4110'),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => server.close(() => process.exit(0)));
if (process.env.TEST_TLS_CERT_FILE && process.env.TEST_TLS_KEY_FILE) {
  const tlsServer = https.createServer(
    {
      cert: readFileSync(process.env.TEST_TLS_CERT_FILE),
      key: readFileSync(process.env.TEST_TLS_KEY_FILE),
    },
    handler,
  );
  tlsServer.listen(4111, '127.0.0.1');
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => tlsServer.close());
}
