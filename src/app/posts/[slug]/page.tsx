import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound, permanentRedirect } from 'next/navigation';
import { ApiError, getArticle } from '@/lib/api-server';
import { getConfig } from '@/lib/config';
import { assertSlug, readingPost } from '@/lib/reading';
import { ArticleHeader, ArticleTags } from '@/components/article/article-header';
import { Markdown } from '@/components/article/markdown';
import { AvailabilityRefresh } from '@/features/reading/availability-refresh';
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
  const url = origin ? `${origin}/posts/${post.slug}` : undefined;
  return {
    title: post.title,
    description: post.summary,
    alternates: url ? { canonical: url } : undefined,
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.summary,
      ...(url ? { url, images: [`${origin}/social.svg`] } : {}),
      publishedTime: post.firstPublishedAt,
      modifiedTime: post.updatedAt,
      authors: [post.author.displayName],
    },
    twitter: { card: 'summary', title: post.title, description: post.summary },
  };
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
  const structured = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.summary,
    datePublished: post.firstPublishedAt,
    dateModified: post.updatedAt,
    author: {
      '@type': 'Person',
      name: post.author.displayName,
      ...(origin ? { url: `${origin}/authors/${post.author.handle}` } : {}),
    },
    ...(origin ? { url: `${origin}/posts/${post.slug}` } : {}),
  };
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, '\\u003c') }}
      />
    </article>
  );
}
