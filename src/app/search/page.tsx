import type { Metadata } from 'next';
import { ApiError, getAuthor, getCategories, getTags, searchPosts } from '@/lib/api-server';
import { queryValue, pageNumber, readingPost, slugPattern, type SearchParams } from '@/lib/reading';
import { resourceUuidPattern } from '@/lib/request-policy';
import { ArticleList } from '@/components/article/article-card';
import { PageIntro } from '@/components/ui/page-intro';
import { SearchForm } from '@/components/ui/search-form';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
export const metadata: Metadata = {
  title: 'Search the journal',
  robots: { index: false, follow: false },
};
export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = queryValue(params.q).trim();
  const page = pageNumber(params.page);
  const id = (key: string) => {
    const value = queryValue(params[key], 36);
    return resourceUuidPattern.test(value) ? value : undefined;
  };
  const categoryId = id('categoryId'),
    tagId = id('tagId');
  const author = queryValue(params.author).trim();
  const linkedAuthorId = queryValue(params.authorId).trim();
  async function search() {
    let authorId = resourceUuidPattern.test(linkedAuthorId) ? linkedAuthorId : undefined;
    let feedback: string | undefined;
    if (Array.isArray(params.author)) feedback = 'Use one author handle at a time.';
    else if (author) {
      if (author.length > 120 || !slugPattern.test(author))
        feedback = 'Enter an author handle using lowercase letters, numbers, and hyphens.';
      else {
        try {
          authorId = (await getAuthor(author)).data.id;
        } catch (error) {
          if (error instanceof ApiError && [400, 404, 422].includes(error.status))
            feedback =
              'We couldn’t find an author with that handle. Check the spelling or clear the author filter.';
          else throw error;
        }
      }
    } else if (linkedAuthorId && !authorId)
      feedback = 'This author filter is invalid. Clear it or enter an author handle.';
    if (!q || feedback) return { result: undefined, feedback, authorId };
    try {
      return {
        result: await searchPosts({
          q,
          page,
          pageSize: 12,
          categoryId,
          authorId,
          tagIds: tagId ? [tagId] : undefined,
        }),
        feedback,
        authorId,
      };
    } catch (error) {
      if (error instanceof ApiError && [400, 422].includes(error.status))
        return { result: undefined, feedback: error.message, authorId };
      throw error;
    }
  }
  const [categories, tags, searchState] = await Promise.all([
    getCategories({ pageSize: 50 }),
    getTags({ pageSize: 50 }),
    search(),
  ]);
  const { result, feedback, authorId } = searchState;
  const pagination = result?.meta.pagination;
  const filters = Object.fromEntries(
    Object.entries({
      q,
      categoryId,
      tagId,
      author: author || undefined,
      authorId: author ? undefined : authorId,
    }).filter((entry): entry is [string, string] => !!entry[1]),
  );
  return (
    <>
      <PageIntro
        eyebrow="A little curiosity goes a long way"
        title="Find your next good read."
        description="Explore the journal by subject, question, or a thought you can’t shake."
      />
      <SearchForm
        query={q}
        categoryId={categoryId}
        tagId={tagId}
        author={author}
        authorId={author ? undefined : linkedAuthorId}
        categories={categories.data.map((item) => ({ value: item.id, label: item.name }))}
        tags={tags.data.map((item) => ({ value: item.id, label: item.name }))}
      />
      {feedback ? (
        <section className="error-panel" role="alert" aria-labelledby="search-feedback">
          <h2 id="search-feedback">Adjust your search</h2>
          <p>{feedback}</p>
        </section>
      ) : result ? (
        <section aria-labelledby="search-results">
          <div className="section-heading">
            <h2 id="search-results">Results for “{q}”</h2>
            {pagination?.kind === 'PAGE' && (
              <span>
                {pagination.totalItems} {pagination.totalItems === 1 ? 'story' : 'stories'}
              </span>
            )}
          </div>
          {result.data.length ? (
            <ArticleList posts={result.data.map(readingPost)} />
          ) : (
            <EmptyState
              title="No stories found."
              description="Try another word or adjust your filters. A new perspective might be one search away."
            />
          )}
          {pagination?.kind === 'PAGE' && (
            <Pagination
              page={page}
              hasMore={page < pagination.totalPages}
              basePath="/search"
              query={filters}
            />
          )}
        </section>
      ) : (
        <EmptyState
          title="Start with a little curiosity."
          description="Enter a word or phrase to search published stories."
        />
      )}
    </>
  );
}
