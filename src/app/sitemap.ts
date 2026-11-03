import type { MetadataRoute } from 'next';
import { ApiError, getFeed } from '@/lib/api-server';
import { getConfig } from '@/lib/config';
import { publishedDiscoveryEntries } from '@/lib/metadata-policy';
export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { environment, webOrigin } = getConfig();
  if (!webOrigin || environment !== 'production') return [];
  const posts = [];
  let cursor: string | undefined;
  for (let page = 0; page < 100; page++) {
    const response = await getFeed({ cursor, pageSize: 50 });
    posts.push(...response.data);
    const pagination = response.meta.pagination;
    if (!pagination || pagination.kind !== 'CURSOR' || !pagination.hasMore)
      return [{ url: webOrigin }, ...publishedDiscoveryEntries(posts, webOrigin)];
    cursor = pagination.nextCursor ?? undefined;
  }
  throw new ApiError(503, 'DEPENDENCY_UNAVAILABLE');
}
