import 'server-only';
import { cache } from 'react';
import { getConfig } from '@/lib/config';
import { getRequestContext } from '@/lib/request-context';
import {
  ContractError,
  errorMessage,
  validateEnvelope,
  validatePublicResponse,
  type PublicOperation,
} from './api-contract';
import type { components } from './api-types';

export type {
  PublicPostSummary,
  PublicPost,
  PublicAuthor,
  Taxon,
  SlugResolution,
  CursorPagination,
  PagePagination,
} from './api-contract';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly traceId?: string,
    public readonly retryAfter?: string,
  ) {
    super(errorMessage(code));
    this.name = 'ApiError';
  }
}

/** Only server configuration chooses the upstream. Browser credentials never enter public requests. */
export async function backendRequest<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  if (
    !path.startsWith('/v1/') ||
    path.includes('\\') ||
    path.includes('#') ||
    path.includes('\r') ||
    path.includes('\n')
  )
    throw new Error('Invalid backend path');
  const config = getConfig();
  const metadata = await getRequestContext();
  const headers = new Headers(init.headers);
  headers.delete('cookie');
  headers.delete('authorization');
  headers.delete('x-blogpost-web-session');
  for (const [key, value] of metadata) headers.set(key, value);
  headers.set('Accept', 'application/json');
  let response: Response;
  try {
    response = await fetch(`${config.backendOrigin}${path}`, {
      ...init,
      headers,
      cache: 'no-store',
      redirect: 'error',
      signal: init.signal
        ? AbortSignal.any([init.signal, AbortSignal.timeout(8000)])
        : AbortSignal.timeout(8000),
    });
  } catch {
    throw new ApiError(503, 'DEPENDENCY_UNAVAILABLE');
  }
  let body: unknown;
  const headerTrace = response.headers.get('X-Trace-ID') ?? undefined;
  const traceId = headerTrace && /^[a-f0-9]{32}$/.test(headerTrace) ? headerTrace : undefined;
  try {
    if (!response.headers.get('content-type')?.toLowerCase().includes('application/json'))
      throw new ContractError();
    body = await response.json();
    const envelope = validateEnvelope(body, response.status);
    if (traceId && traceId !== envelope.traceId) throw new ContractError();
    if (!response.ok) {
      const error = envelope.error as { code: string };
      throw new ApiError(
        response.status,
        error.code,
        String(envelope.traceId),
        response.headers.get('Retry-After') ?? undefined,
      );
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(503, 'INVALID_API_RESPONSE', traceId);
  }
  return body as T;
}

async function publicRequest<K extends PublicOperation>(
  operation: K,
  path: string,
): Promise<components['schemas'][K]> {
  const body = await backendRequest(path);
  try {
    return validatePublicResponse(operation, body);
  } catch {
    throw new ApiError(503, 'INVALID_API_RESPONSE', (body as { traceId: string }).traceId);
  }
}

export type FeedOptions = {
  cursor?: string;
  pageSize?: number;
  categoryId?: string;
  authorId?: string;
  tagIds?: string[];
};
export type PageOptions = { page?: number; pageSize?: number };
export type SearchOptions = Omit<FeedOptions, 'cursor'> & PageOptions & { q: string };

function query(options: FeedOptions | SearchOptions | PageOptions): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(options)) {
    if (value === undefined || value === '') continue;
    if (Array.isArray(value)) value.forEach((item) => params.append(key, item));
    else params.set(key, String(value));
  }
  const value = params.toString();
  return value ? `?${value}` : '';
}

export function getFeed(options: FeedOptions = {}) {
  return publicRequest('ListPublicPostsEnvelope', `/v1/public/posts${query(options)}`);
}
export function getCategories(options: PageOptions = {}) {
  return publicRequest('ListPublicCategoriesEnvelope', `/v1/public/categories${query(options)}`);
}
export function getTags(options: PageOptions = {}) {
  return publicRequest('ListPublicTagsEnvelope', `/v1/public/tags${query(options)}`);
}
// React cache only shares a read inside the current server render, including metadata.
export const getArticle = cache((slug: string) =>
  publicRequest(
    'ResolvePublicPostSlugEnvelope',
    `/v1/public/posts/by-slug/${encodeURIComponent(slug)}`,
  ),
);
export function getAuthor(handle: string) {
  return publicRequest(
    'GetPublicAuthorEnvelope',
    `/v1/public/authors/${encodeURIComponent(handle)}`,
  );
}
export function searchPosts(options: SearchOptions) {
  return publicRequest('SearchPublicPostsEnvelope', `/v1/public/search${query(options)}`);
}
