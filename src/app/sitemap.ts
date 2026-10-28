import type { MetadataRoute } from 'next';
import { ApiError, getFeed } from '@/lib/api-server';
import { getConfig } from '@/lib/config';
export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { environment, webOrigin } = getConfig();
  if (!webOrigin || environment !== 'production') return [];
  const entries: MetadataRoute.Sitemap = [{ url: webOrigin }];
  let cursor: string | undefined;
  for (let page = 0; page < 100; page++) {
    const response = await getFeed({ cursor, pageSize: 50 });
    entries.push(
      ...response.data.map((post) => ({
        url: `${webOrigin}/posts/${post.slug}`,
        lastModified: post.updatedAt,
      })),
    );
    const pagination = response.meta.pagination;
    if (!pagination || pagination.kind !== 'CURSOR' || !pagination.hasMore) return entries;
    cursor = pagination.nextCursor ?? undefined;
  }
  throw new ApiError(503, 'DEPENDENCY_UNAVAILABLE');
}
