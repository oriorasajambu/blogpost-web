import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound, permanentRedirect } from 'next/navigation';
import { ApiError, getArticle } from '@/lib/api-server';
import { getConfig } from '@/lib/config';
import { assertSlug, readingPost } from '@/lib/reading';
import { ArticleHeader, ArticleTags } from '@/components/article/article-header';
import { Markdown } from '@/components/article/markdown';
import { AvailabilityRefresh } from '@/features/reading/availability-refresh';
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
  return (
    <article className="article-page">
      <AvailabilityRefresh />
      <ArticleHeader post={readingPost(post)} />
      <Markdown source={post.markdown} postId={post.id} media={post.media} />
      <ArticleTags tags={post.tags} />
      <script
        nonce={nonce}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: scriptJson(structured) }}
      />
    </article>
  );
}
