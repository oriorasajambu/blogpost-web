import type { components } from './api-types';

export type PublicPostSummary = components['schemas']['PublicPostSummary'];
export type PublicPost = components['schemas']['PublicPost'];
export type PublicAuthor = components['schemas']['PublicAuthor'];
export type Taxon = components['schemas']['Taxon'];
export type SlugResolution = components['schemas']['SlugResolution'];
export type CursorPagination = components['schemas']['CursorPagination'];
export type PagePagination = components['schemas']['PagePagination'];
export type PublicOperation =
  | 'ListPublicPostsEnvelope'
  | 'ResolvePublicPostSlugEnvelope'
  | 'GetPublicAuthorEnvelope'
  | 'SearchPublicPostsEnvelope'
  | 'ListPublicCategoriesEnvelope'
  | 'ListPublicTagsEnvelope';

type RecordValue = Record<string, unknown>;
const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const tracePattern = /^[a-f0-9]{32}$/;
const timestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export class ContractError extends Error {
  constructor() {
    super('The API returned an incompatible response.');
    this.name = 'ContractError';
  }
}

function assert(condition: unknown): asserts condition {
  if (!condition) throw new ContractError();
}
function object(value: unknown): asserts value is RecordValue {
  assert(typeof value === 'object' && value !== null && !Array.isArray(value));
}
function text(value: unknown, max = Infinity, nonempty = false): asserts value is string {
  assert(
    typeof value === 'string' && Array.from(value).length <= max && (!nonempty || /\S/.test(value)),
  );
}
function integer(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): asserts value is number {
  assert(Number.isSafeInteger(value) && Number(value) >= min && Number(value) <= max);
}
function bool(value: unknown): asserts value is boolean {
  assert(typeof value === 'boolean');
}
function uuid(value: unknown): asserts value is string {
  assert(typeof value === 'string' && uuidPattern.test(value));
}
function slug(value: unknown): asserts value is string {
  text(value, 120, true);
  assert(slugPattern.test(value));
}
function date(value: unknown): asserts value is string {
  assert(typeof value === 'string' && timestampPattern.test(value));
  const parsed = new Date(value);
  assert(Number.isFinite(parsed.getTime()) && parsed.toISOString() === value);
}
function list(
  value: unknown,
  validator: (item: unknown) => void,
  max = Infinity,
): asserts value is unknown[] {
  assert(Array.isArray(value) && value.length <= max);
  value.forEach(validator);
}
function author(value: unknown) {
  object(value);
  uuid(value.id);
  slug(value.handle);
  text(value.displayName, 80, true);
}
function taxon(value: unknown) {
  object(value);
  uuid(value.id);
  slug(value.slug);
  text(value.name, 80, true);
  bool(value.active);
}
function media(value: unknown, postId?: string) {
  object(value);
  uuid(value.mediaId);
  integer(value.width, 1);
  integer(value.height, 1);
  assert(['image/jpeg', 'image/png', 'image/webp'].includes(String(value.mimeType)));
  list(
    value.variants,
    (variant) => {
      object(variant);
      assert(['w480', 'w960', 'w1600'].includes(String(variant.name)));
      integer(variant.width, 1);
      integer(variant.height, 1);
      integer(variant.byteSize, 1);
      assert(['image/jpeg', 'image/png', 'image/webp'].includes(String(variant.mimeType)));
      text(variant.apiPath);
      // A response path never becomes an arbitrary proxy URL.
      const path =
        /^\/v1\/public\/posts\/([a-f0-9-]+)\/media\/([a-f0-9-]+)\/(w480|w960|w1600)$/.exec(
          variant.apiPath,
        );
      assert(
        path &&
          uuidPattern.test(path[1]) &&
          path[2] === value.mediaId &&
          path[3] === variant.name &&
          (!postId || path[1] === postId),
      );
    },
    3,
  );
  assert(
    value.variants.length === 3 &&
      new Set(value.variants.map((variant) => (variant as RecordValue).name)).size === 3,
  );
}
function summary(value: unknown) {
  object(value);
  uuid(value.id);
  slug(value.slug);
  text(value.title, 160, true);
  text(value.summary, 320, true);
  author(value.author);
  taxon(value.category);
  list(value.tags, taxon, 5);
  uuid(value.publishedRevisionId);
  date(value.firstPublishedAt);
  date(value.updatedAt);
  if (value.cover !== null) {
    media(value.cover, value.id);
    object(value.cover);
    bool(value.cover.decorative);
    text(value.cover.altText, 300, !value.cover.decorative);
    assert(!value.cover.decorative || value.cover.altText === '');
  }
}
function post(value: unknown) {
  summary(value);
  object(value);
  text(value.markdown);
  assert(new TextEncoder().encode(value.markdown).length <= 131072);
  assert(value.markdownContractVersion === 1);
  list(value.media, (item) => media(item, String(value.id)));
}
function pagination(value: unknown, kind: 'CURSOR' | 'PAGE') {
  object(value);
  assert(value.kind === kind);
  integer(value.pageSize, 1, 50);
  bool(value.hasMore);
  if (kind === 'CURSOR') {
    if (value.nextCursor !== null) text(value.nextCursor, 2048, true);
    assert(!value.hasMore || value.nextCursor !== null);
  } else {
    integer(value.page, 1);
    integer(value.totalItems);
    integer(value.totalPages);
    bool(value.truncated);
  }
}

/** Validate required wire fields, while allowing additive response fields. */
export function validateEnvelope(value: unknown, status: number): RecordValue {
  object(value);
  date(value.timestamp);
  assert(value.statusCode === status);
  assert(typeof value.traceId === 'string' && tracePattern.test(value.traceId));
  object(value.message);
  text(value.message.title);
  text(value.message.descriptions);
  object(value.meta);
  assert(value.meta.contractVersion === '1.0.0');
  assert('pagination' in value.meta && 'idempotency' in value.meta);
  if (value.meta.idempotency !== null) {
    object(value.meta.idempotency);
    bool(value.meta.idempotency.replayed);
    date(value.meta.idempotency.expiresAt);
  }
  if (status >= 400) {
    assert(value.responseKey === 'ERROR' && value.data === null && value.meta.pagination === null);
    object(value.error);
    text(value.error.code, 80, true);
    list(
      value.error.fieldErrors,
      (field) => {
        object(field);
        assert(['header', 'path', 'query', 'body'].includes(String(field.location)));
        text(field.field, 2048);
        text(field.code, 80, true);
        object(field.params);
      },
      50,
    );
    assert(
      value.error.context === null ||
        (typeof value.error.context === 'object' && !Array.isArray(value.error.context)),
    );
  } else {
    assert(value.responseKey === 'SUCCESS' && value.error === null && 'data' in value);
  }
  return value;
}

export function validatePublicResponse<K extends PublicOperation>(
  operation: K,
  value: unknown,
  status = 200,
): components['schemas'][K] {
  const envelope = validateEnvelope(value, status);
  assert(status === 200);
  object(envelope.meta);
  assert(envelope.meta.idempotency === null);
  switch (operation) {
    case 'ListPublicPostsEnvelope':
      list(envelope.data, summary, 50);
      pagination(envelope.meta.pagination, 'CURSOR');
      break;
    case 'SearchPublicPostsEnvelope':
      list(envelope.data, summary, 50);
      pagination(envelope.meta.pagination, 'PAGE');
      break;
    case 'ListPublicCategoriesEnvelope':
    case 'ListPublicTagsEnvelope':
      list(envelope.data, taxon, 50);
      pagination(envelope.meta.pagination, 'PAGE');
      break;
    case 'GetPublicAuthorEnvelope':
      author(envelope.data);
      object(envelope.data);
      text(envelope.data.bio, 500);
      assert(envelope.meta.pagination === null);
      break;
    case 'ResolvePublicPostSlugEnvelope': {
      object(envelope.data);
      slug(envelope.data.canonicalSlug);
      assert(envelope.data.canonicalPath === `/posts/${envelope.data.canonicalSlug}`);
      assert(envelope.data.resolution === 'CANONICAL' || envelope.data.resolution === 'REDIRECT');
      if (envelope.data.resolution === 'CANONICAL') {
        post(envelope.data.post);
        object(envelope.data.post);
        assert(envelope.data.post.slug === envelope.data.canonicalSlug);
      } else assert(envelope.data.post === null);
      assert(envelope.meta.pagination === null);
      break;
    }
  }
  return envelope as components['schemas'][K];
}

export function errorMessage(code: string): string {
  switch (code) {
    case 'RESOURCE_NOT_FOUND':
      return 'This article is unavailable. It may have been withdrawn or moved.';
    case 'SEARCH_QUERY_NOT_SEARCHABLE':
      return 'Try a more specific word or phrase.';
    case 'VALIDATION_FAILED':
      return 'Check your search and filters, then try again.';
    case 'INVALID_CURSOR':
      return 'This page link has expired. Start again from the latest articles.';
    case 'RATE_LIMITED':
      return 'Too many requests. Please wait a moment and try again.';
    default:
      return 'We couldn’t load this content. Please try again shortly.';
  }
}
