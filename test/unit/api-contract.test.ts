import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  ContractError,
  errorMessage,
  validateEnvelope,
  validatePublicResponse,
  type PublicOperation,
} from '../../src/lib/api-contract';

// Intentional unsafe boundary: these tests mutate wire JSON into invalid shapes.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fixture(operation: string): Record<string, any> {
  return JSON.parse(
    readFileSync(
      new URL(`../../contracts/fixtures/operations/${operation}.response.json`, import.meta.url),
      'utf8',
    ),
  );
}

const fixtures: [PublicOperation, string][] = [
  ['ListPublicPostsEnvelope', 'listPublicPosts'],
  ['ResolvePublicPostSlugEnvelope', 'resolvePublicPostSlug'],
  ['GetPublicAuthorEnvelope', 'getPublicAuthor'],
  ['SearchPublicPostsEnvelope', 'searchPublicPosts'],
  ['ListPublicCategoriesEnvelope', 'listPublicCategories'],
  ['ListPublicTagsEnvelope', 'listPublicTags'],
];

for (const [schema, file] of fixtures) {
  test(`accepts pinned backend ${file} response`, () => {
    const response = fixture(file);
    assert.equal(validatePublicResponse(schema, response), response);
  });
}

test('accepts additive fields without losing list envelope pagination', () => {
  const response = fixture('listPublicPosts');
  response.meta.contractVersion = '1.1.0';
  response.future = { enabled: true };
  response.data[0].future = 'safe';
  const result = validatePublicResponse('ListPublicPostsEnvelope', response);
  assert.ok(Array.isArray(result.data));
  assert.equal(result.meta.pagination.kind, 'CURSOR');
  assert.equal(result.meta.contractVersion, '1.1.0');
});

test('rejects incompatible major and malformed runtime contract versions', () => {
  for (const version of ['2.0.0', '0.9.0', '01.0.0', '1.1', 'v1.1.0', '', null]) {
    const response = fixture('listPublicPosts');
    response.meta.contractVersion = version;
    assert.throws(() => validatePublicResponse('ListPublicPostsEnvelope', response), ContractError);
  }
});

test('rejects missing required fields instead of inventing empty content', () => {
  const response = fixture('listPublicPosts');
  delete response.data[0].summary;
  assert.throws(() => validatePublicResponse('ListPublicPostsEnvelope', response), ContractError);
});

test('rejects unpaired UTF-16 surrogates while accepting valid Unicode scalar text', () => {
  const response = fixture('resolvePublicPostSlug');
  response.data.post.title = 'A curious reader 👩🏽‍💻';
  assert.ok(validatePublicResponse('ResolvePublicPostSlugEnvelope', response));
  response.data.post.title = 'An invalid title \ud800';
  assert.throws(
    () => validatePublicResponse('ResolvePublicPostSlugEnvelope', response),
    ContractError,
  );
  response.data.post.title = 'A valid title';
  response.data.post.markdown = 'An invalid source \udc00';
  assert.throws(
    () => validatePublicResponse('ResolvePublicPostSlugEnvelope', response),
    ContractError,
  );
});

test('rejects HTTP/envelope status disagreement', () => {
  assert.throws(
    () => validatePublicResponse('ListPublicPostsEnvelope', fixture('listPublicPosts'), 404),
    ContractError,
  );
});

test('rejects a legacy nested list DTO', () => {
  const response = fixture('listPublicPosts');
  response.data = { items: response.data };
  assert.throws(() => validatePublicResponse('ListPublicPostsEnvelope', response), ContractError);
});

test('rejects unsafe redirect paths and unknown resolution states', () => {
  for (const path of [
    '//elsewhere.example/posts/article',
    '/posts/another-article',
    '/posts/a-reviewed-article?token=secret',
  ]) {
    const response = fixture('resolvePublicPostSlug');
    response.data.canonicalPath = path;
    assert.throws(
      () => validatePublicResponse('ResolvePublicPostSlugEnvelope', response),
      ContractError,
    );
  }
  const response = fixture('resolvePublicPostSlug');
  response.data.resolution = 'PRIVATE';
  assert.throws(
    () => validatePublicResponse('ResolvePublicPostSlugEnvelope', response),
    ContractError,
  );
});

test('redirect descriptor never embeds article content', () => {
  const response = fixture('resolvePublicPostSlug');
  response.data.resolution = 'REDIRECT';
  assert.throws(
    () => validatePublicResponse('ResolvePublicPostSlugEnvelope', response),
    ContractError,
  );
  response.data.post = null;
  assert.equal(
    validatePublicResponse('ResolvePublicPostSlugEnvelope', response).data.resolution,
    'REDIRECT',
  );
});

test('rejects unsupported Markdown contract versions and oversized UTF-8 source', () => {
  const response = fixture('resolvePublicPostSlug');
  response.data.post.markdownContractVersion = 2;
  assert.throws(
    () => validatePublicResponse('ResolvePublicPostSlugEnvelope', response),
    ContractError,
  );
  response.data.post.markdownContractVersion = 1;
  response.data.post.markdown = '😀'.repeat(32769);
  assert.throws(
    () => validatePublicResponse('ResolvePublicPostSlugEnvelope', response),
    ContractError,
  );
});

test('media paths must identify the current post, media and approved variant', () => {
  for (const path of [
    'https://storage.example/image.png',
    '/v1/public/posts/10000000-0000-4000-8000-000000000099/media/50000000-0000-4000-8000-000000000001/w480',
  ]) {
    const response = fixture('listPublicPosts');
    response.data[0].cover.variants[0].apiPath = path;
    assert.throws(() => validatePublicResponse('ListPublicPostsEnvelope', response), ContractError);
  }
});

test('informative and decorative covers use explicit alt-text rules', () => {
  const response = fixture('listPublicPosts');
  response.data[0].cover.altText = '';
  assert.throws(() => validatePublicResponse('ListPublicPostsEnvelope', response), ContractError);
  response.data[0].cover.decorative = true;
  assert.ok(validatePublicResponse('ListPublicPostsEnvelope', response));
});

test('rejects incompatible pagination and invalid timestamps', () => {
  const response = fixture('listPublicPosts');
  response.meta.pagination.hasMore = true;
  assert.throws(() => validatePublicResponse('ListPublicPostsEnvelope', response), ContractError);
  response.meta.pagination.hasMore = false;
  response.data[0].firstPublishedAt = '2026-02-31T08:20:30.123Z';
  assert.throws(() => validatePublicResponse('ListPublicPostsEnvelope', response), ContractError);
});

test('preserves unknown backend codes while selecting safe client-owned copy', () => {
  const response = JSON.parse(
    readFileSync(
      new URL('../../contracts/fixtures/errors/resource-not-found.json', import.meta.url),
      'utf8',
    ),
  );
  response.error.code = 'NEW_OPTIONAL_SERVER_CODE';
  assert.equal(
    (validateEnvelope(response, 404).error as { code: string }).code,
    'NEW_OPTIONAL_SERVER_CODE',
  );
  assert.match(errorMessage(response.error.code), /try again/i);
  assert.match(errorMessage('SEARCH_QUERY_NOT_SEARCHABLE'), /specific/i);
});
