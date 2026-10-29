import 'server-only';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import {
  ApiError,
  getCategories,
  getFeed,
  getTags,
  type FeedOptions,
  type PublicPostSummary,
} from './api-server';
import type { ReadingPost } from '@/components/article/article-card';
import { mediaSources } from './markdown';
export const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export function assertSlug(slug: string) {
  if (slug.length > 120 || !slugPattern.test(slug)) notFound();
}
export function readingPost(post: PublicPostSummary): ReadingPost {
  return {
    ...post,
    coverImage: post.cover
      ? {
          src: `/media/${post.id}/${post.cover.mediaId}/w960`,
          srcSet: mediaSources(post.id, post.cover),
          alt: post.cover.decorative ? '' : post.cover.altText,
          width: post.cover.width,
          height: post.cover.height,
        }
      : undefined,
  };
}
export type SearchParams = Promise<Record<string, string | string[] | undefined>>;
export function queryValue(value: string | string[] | undefined, max = 200) {
  return typeof value === 'string' ? Array.from(value).slice(0, max).join('') : '';
}
export function pageNumber(value: string | string[] | undefined) {
  return typeof value === 'string' && /^[1-9]\d{0,5}$/.test(value) ? Number(value) : 1;
}
export async function getReadingFeed(options: FeedOptions) {
  try {
    return await getFeed(options);
  } catch (error) {
    if (
      options.cursor &&
      error instanceof ApiError &&
      error.status === 400 &&
      error.code === 'INVALID_CURSOR'
    )
      return null;
    throw error;
  }
}
// Search filters offer every public option, while the header intentionally shows a short selection.
export const getPublicTaxonomy = cache(async (kind: 'categories' | 'tags') => {
  const items = [];
  for (let page = 1; page <= 20; page++) {
    const response = await (kind === 'categories' ? getCategories : getTags)({
      page,
      pageSize: 50,
    });
    items.push(...response.data);
    const pagination = response.meta.pagination;
    if (!pagination || pagination.kind !== 'PAGE' || page >= pagination.totalPages) return items;
  }
  // Never silently present a truncated filter list as complete.
  throw new ApiError(503, 'DEPENDENCY_UNAVAILABLE');
});
export const getTaxon = cache(async (kind: 'categories' | 'tags', slug: string) => {
  assertSlug(slug);
  for (let page = 1; page <= 20; page++) {
    const response = await (kind === 'categories' ? getCategories : getTags)({
      page,
      pageSize: 50,
    });
    const found = response.data.find((item) => item.slug === slug);
    if (found) return found;
    const pagination = response.meta.pagination;
    if (!pagination || pagination.kind !== 'PAGE' || page >= pagination.totalPages) notFound();
  }
  throw new ApiError(503, 'DEPENDENCY_UNAVAILABLE');
});
