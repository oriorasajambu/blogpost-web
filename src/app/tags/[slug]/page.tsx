import type { Metadata } from 'next';
import { ReadingLink as Link } from '@/components/layout/reading-link';
import {
  getReadingFeed,
  getTaxon,
  queryValue,
  readingPost,
  type SearchParams,
} from '@/lib/reading';
import { ArticleList } from '@/components/article/article-card';
import { PageIntro } from '@/components/ui/page-intro';
import { EmptyState } from '@/components/ui/empty-state';
import { publicMetadata } from '@/lib/metadata';
import { ExpiredPage } from '@/components/ui/expired-page';
type Props = { params: Promise<{ slug: string }>; searchParams: SearchParams };
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tag = await getTaxon('tags', slug);
  return {
    ...publicMetadata({
      title: `${tag.name} articles`,
      description: `Stories connected by ${tag.name.toLowerCase()}.`,
      path: `/tags/${slug}`,
    }),
    ...((await searchParams).cursor ? { robots: { index: false, follow: true } } : {}),
  };
}
export default async function TagPage({ params, searchParams }: Props) {
  const tag = await getTaxon('tags', (await params).slug);
  const cursor = queryValue((await searchParams).cursor, 2048);
  const result = await getReadingFeed({
    tagIds: [tag.id],
    pageSize: 12,
    cursor: cursor || undefined,
  });
  if (!result) return <ExpiredPage basePath={`/tags/${tag.slug}`} />;
  const pagination = result.meta.pagination;
  return (
    <>
      <PageIntro
        eyebrow="Follow a thread"
        title={tag.name}
        description={`Stories connected by ${tag.name.toLowerCase()}.`}
      />
      {result.data.length ? (
        <ArticleList posts={result.data.map(readingPost)} />
      ) : (
        <EmptyState
          title="This thread is just beginning."
          description="No published articles use this tag yet."
          actionHref="/"
          actionLabel="Browse latest stories"
        />
      )}
      {pagination?.kind === 'CURSOR' && pagination.nextCursor && (
        <nav className="pagination" aria-label="Article pagination">
          <Link href={`?cursor=${encodeURIComponent(pagination.nextCursor)}`}>Older stories →</Link>
        </nav>
      )}
    </>
  );
}
