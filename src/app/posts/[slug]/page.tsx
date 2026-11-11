import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound, permanentRedirect } from 'next/navigation';
import { ApiError, getArticle, getFeed } from '@/lib/api-server';
import { getConfig } from '@/lib/config';
import { assertSlug, readingPost } from '@/lib/reading';
import { ArticleHeader, ArticleTags } from '@/components/article/article-header';
import { Markdown } from '@/components/article/markdown';
import { formatDate, type ReadingPost } from '@/components/article/article-card';
import { ReadingLink as Link } from '@/components/layout/reading-link';
import { ArticleOutline, ReadingProgress } from '@/features/reading/article-outline';
import { articleOutline, readingMinutes } from '@/lib/article-reading';
import { AvailabilityRefresh } from '@/features/reading/availability-refresh';
import { fadingRule, textLink } from '@/components/ui/styles';
import { articleStructuredData, publicationMetadata, scriptJson } from '@/lib/metadata-policy';
type Props = { params: Promise<{ slug: string }> };
async function article(slug: string) {
  assertSlug(slug);
  try {
    return (await getArticle(slug)).data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}
/** Up to three other stories from the same category; reading never fails because of them. */
async function relatedStories(categoryId: string, postId: string): Promise<ReadingPost[]> {
  try {
    const feed = await getFeed({ categoryId, pageSize: 4 });
    return feed.data
      .filter((story) => story.id !== postId)
      .slice(0, 3)
      .map(readingPost);
  } catch {
    return [];
  }
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolution = await article((await params).slug);
  const post = resolution.post;
  if (!post) return { robots: { index: false } };
  const origin = getConfig().webOrigin;
  return publicationMetadata({
    title: post.title,
    description: post.summary,
    path: `/posts/${post.slug}`,
    origin,
    article: {
      publishedTime: post.firstPublishedAt,
      modifiedTime: post.updatedAt,
      author: post.author.displayName,
    },
  });
}
export default async function ArticlePage({ params }: Props) {
  const resolution = await article((await params).slug);
  if (resolution.resolution === 'REDIRECT') {
    // Confirm availability before redirecting: a withdrawn target never becomes a stale redirect.
    const target = await article(resolution.canonicalSlug);
    if (!target.post) notFound();
    permanentRedirect(`/posts/${encodeURIComponent(resolution.canonicalSlug)}`);
  }
  const post = resolution.post;
  if (!post) notFound();
  const origin = getConfig().webOrigin;
  const structured = articleStructuredData(post, origin);
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  const outline = articleOutline(post.markdown);
  const related = await relatedStories(post.category.id, post.id);
  return (
    <article className="pb-6">
      <ReadingProgress />
      <AvailabilityRefresh />
      <ArticleHeader post={readingPost(post)} minutes={readingMinutes(post.markdown)} />
      <div
        className={`mt-10 grid gap-6 sm:mt-12 ${outline.length > 1 ? 'min-[1081px]:grid-cols-[13.75rem_minmax(0,1fr)] min-[1081px]:gap-16' : ''}`}
      >
        {outline.length > 1 && <ArticleOutline items={outline} />}
        <div className="min-w-0">
          <Markdown source={post.markdown} postId={post.id} media={post.media} />
          <ArticleTags tags={post.tags} />
        </div>
      </div>
      {related.length > 0 && (
        <section className="mt-20 flex flex-col gap-7" aria-labelledby="related-heading">
          <div className={fadingRule} aria-hidden="true" />
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <h2 id="related-heading" className="text-2xl tracking-[-0.01em]">
              Keep reading in {post.category.name}
            </h2>
            <Link
              className={textLink}
              href={`/categories/${encodeURIComponent(post.category.slug)}`}
            >
              All {post.category.name} stories
            </Link>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {related.map((story) => (
              <article key={story.id} className="flex min-w-0 flex-col gap-2.5">
                <h3 className="line-clamp-3 text-lg leading-snug">
                  <Link
                    href={`/posts/${encodeURIComponent(story.slug)}`}
                    className="text-text no-underline hover:text-accent-ink"
                  >
                    {story.title}
                  </Link>
                </h3>
                <p className="line-clamp-2 text-sm text-muted">{story.summary}</p>
                <p className="flex flex-wrap items-center gap-x-2 text-[0.8125rem] text-faint">
                  <span>{story.author.displayName}</span>
                  <span aria-hidden="true">·</span>
                  <time dateTime={story.firstPublishedAt}>
                    {formatDate(story.firstPublishedAt)}
                  </time>
                </p>
              </article>
            ))}
          </div>
        </section>
      )}
      <script
        nonce={nonce}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: scriptJson(structured) }}
      />
    </article>
  );
}
