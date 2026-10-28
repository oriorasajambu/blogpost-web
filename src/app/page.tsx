import Link from 'next/link';
import type { Metadata } from 'next';
import { canonicalMetadata } from '@/lib/metadata';
import { getFeed } from '@/lib/api-server';
import { queryValue, readingPost, type SearchParams } from '@/lib/reading';
import { ArticleCard, ArticleList } from '@/components/article/article-card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageIntro } from '@/components/ui/page-intro';
export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  return {
    ...canonicalMetadata('/'),
    ...((await searchParams).cursor ? { robots: { index: false, follow: true } } : {}),
  };
}
export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const cursor = queryValue((await searchParams).cursor, 2048);
  const result = await getFeed({ cursor: cursor || undefined, pageSize: 12 });
  const posts = result.data.map(readingPost);
  const pagination = result.meta.pagination;
  return (
    <>
      <PageIntro
        eyebrow="The journal"
        title="Make room for a new perspective."
        description="Thoughtful stories. Useful ideas. A quiet corner of the internet to pause, read, and discover something worth keeping."
      />
      {posts.length ? (
        <>
          <section aria-label="Latest story">
            <ArticleCard post={posts[0]} featured />
          </section>
          {posts.length > 1 && (
            <section className="latest-section" aria-labelledby="latest-heading">
              <div className="section-heading">
                <h2 id="latest-heading">More to discover</h2>
                <span>Fresh from the journal</span>
              </div>
              <ArticleList posts={posts.slice(1)} />
            </section>
          )}
        </>
      ) : (
        <EmptyState
          title="The next story starts here."
          description="There are no published articles yet. Come back soon for fresh perspectives."
        />
      )}
      {(cursor || (pagination?.kind === 'CURSOR' && pagination.hasMore)) && (
        <nav className="pagination" aria-label="Article pagination">
          <Link className="text-link" href="/">
            Back to latest
          </Link>
          {pagination?.kind === 'CURSOR' && pagination.nextCursor && (
            <Link
              className="text-link"
              href={`/?cursor=${encodeURIComponent(pagination.nextCursor)}`}
            >
              Older stories →
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
