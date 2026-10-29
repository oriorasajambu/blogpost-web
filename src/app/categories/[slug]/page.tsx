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
  const category = await getTaxon('categories', slug);
  return {
    ...publicMetadata({
      title: `${category.name} articles`,
      description: `Ideas and perspectives from our ${category.name.toLowerCase()} collection.`,
      path: `/categories/${slug}`,
    }),
    ...((await searchParams).cursor ? { robots: { index: false, follow: true } } : {}),
  };
}
export default async function CategoryPage({ params, searchParams }: Props) {
  const category = await getTaxon('categories', (await params).slug);
  const cursor = queryValue((await searchParams).cursor, 2048);
  const result = await getReadingFeed({
    categoryId: category.id,
    pageSize: 12,
    cursor: cursor || undefined,
  });
  if (!result) return <ExpiredPage basePath={`/categories/${category.slug}`} />;
  const pagination = result.meta.pagination;
  return (
    <>
      <PageIntro
        eyebrow="Browse by category"
        title={category.name}
        description={`Ideas and perspectives from our ${category.name.toLowerCase()} collection.`}
      />
      {result.data.length ? (
        <ArticleList posts={result.data.map(readingPost)} />
      ) : (
        <EmptyState
          title="A little room for new ideas."
          description="No articles have been published in this category yet."
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
