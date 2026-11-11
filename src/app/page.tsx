import type { Metadata } from 'next';
import { publicMetadata } from '@/lib/metadata';
import { getReadingFeed, queryValue, readingPost, type SearchParams } from '@/lib/reading';
import { ArticleCard, ArticleList } from '@/components/article/article-card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageIntro } from '@/components/ui/page-intro';
import { ExpiredPage } from '@/components/ui/expired-page';
import { CursorPagination } from '@/components/ui/pagination';
import { fadingRule } from '@/components/ui/styles';
export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  return {
    ...publicMetadata({
      title: 'Ideas worth your time',
      description:
        'Thoughtful stories, useful ideas, and fresh perspectives. A quiet place to read.',
      path: '/',
    }),
    ...((await searchParams).cursor ? { robots: { index: false, follow: true } } : {}),
  };
}
export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const cursor = queryValue((await searchParams).cursor, 2048);
  const result = await getReadingFeed({ cursor: cursor || undefined, pageSize: 12 });
  if (!result) return <ExpiredPage basePath="/" />;
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
            <section aria-labelledby="latest-heading" className="mt-16 flex flex-col gap-7">
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <h2 id="latest-heading" className="text-2xl tracking-[-0.01em]">
                    More to discover
                  </h2>
                  <span className="text-sm text-faint">Fresh from the journal</span>
                </div>
                <div className={fadingRule} aria-hidden="true" />
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
        <CursorPagination
          basePath="/"
          showBack
          nextCursor={pagination?.kind === 'CURSOR' ? pagination.nextCursor : undefined}
        />
      )}
    </>
  );
}
