import { notFound } from 'next/navigation';
import { ApiError, getAuthor, getFeed } from '@/lib/api-server';
import { assertSlug, queryValue, readingPost, type SearchParams } from '@/lib/reading';
import { ArticleList } from '@/components/article/article-card';
import { PageIntro } from '@/components/ui/page-intro';
import { EmptyState } from '@/components/ui/empty-state';
import Link from 'next/link';
import { cache } from 'react';
import type { Metadata } from 'next';
import { canonicalMetadata } from '@/lib/metadata';
const readAuthor = cache(async (handle: string) => {
  assertSlug(handle);
  return getAuthor(handle)
    .then((result) => result.data)
    .catch((error) => {
      if (error instanceof ApiError && error.status === 404) notFound();
      throw error;
    });
});
type Props = { params: Promise<{ handle: string }>; searchParams: SearchParams };
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { handle } = await params;
  const author = await readAuthor(handle);
  return {
    title: `${author.displayName} — Author`,
    description: author.bio || `Published stories by ${author.displayName}.`,
    ...canonicalMetadata(`/authors/${handle}`),
    ...((await searchParams).cursor ? { robots: { index: false, follow: true } } : {}),
  };
}
export default async function AuthorPage({ params, searchParams }: Props) {
  const { handle } = await params;
  const author = await readAuthor(handle);
  const cursor = queryValue((await searchParams).cursor, 2048);
  const result = await getFeed({ authorId: author.id, pageSize: 12, cursor: cursor || undefined });
  const pagination = result.meta.pagination;
  return (
    <>
      <PageIntro
        eyebrow="Meet the author"
        title={author.displayName}
        description={author.bio || 'A contributor to the Blogpost journal.'}
      />
      <section aria-label={`Articles by ${author.displayName}`}>
        {result.data.length ? (
          <ArticleList posts={result.data.map(readingPost)} />
        ) : (
          <EmptyState
            title="A story is on its way."
            description="This author has no published articles yet."
          />
        )}
      </section>
      {pagination?.kind === 'CURSOR' && pagination.nextCursor && (
        <nav className="pagination" aria-label="Article pagination">
          <Link href={`?cursor=${encodeURIComponent(pagination.nextCursor)}`}>Older stories →</Link>
        </nav>
      )}
    </>
  );
}
