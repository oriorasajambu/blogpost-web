import type { Metadata, MetadataRoute } from 'next';
import type { components } from './api-types';

type PublicPost = components['schemas']['PublicPost'];
type PublicSummary = components['schemas']['PublicPostSummary'];
type PageDetails = {
  title: string;
  description: string;
  path: string;
  origin?: string;
  article?: { publishedTime: string; modifiedTime: string; author: string };
};

/** Absolute discovery URLs come only from the validated configured web origin. */
export function publicationMetadata({
  title,
  description,
  path,
  origin,
  article,
}: PageDetails): Metadata {
  const url = origin ? `${origin}${path}` : undefined;
  const image = origin
    ? {
        url: `${origin}/social.png`,
        width: 1200,
        height: 630,
        alt: 'Blogpost. Ideas worth your time.',
        type: 'image/png',
      }
    : undefined;
  return {
    title,
    description,
    ...(url ? { alternates: { canonical: url } } : {}),
    openGraph: {
      type: article ? 'article' : 'website',
      siteName: 'Blogpost',
      title,
      description,
      ...(url ? { url } : {}),
      ...(image ? { images: [image] } : {}),
      ...(article
        ? {
            publishedTime: article.publishedTime,
            modifiedTime: article.modifiedTime,
            authors: [article.author],
          }
        : {}),
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(image ? { images: [{ url: image.url, alt: image.alt }] } : {}),
    },
  };
}

export function articleStructuredData(post: PublicPost, origin?: string) {
  return {
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
    ...(origin
      ? { url: `${origin}/posts/${post.slug}`, mainEntityOfPage: `${origin}/posts/${post.slug}` }
      : {}),
  };
}

/** Keep source text inside its JSON script even when an article contains HTML-looking text. */
export function scriptJson(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

/** Include collection/profile URLs only when a current published summary proves meaningful content. */
export function publishedDiscoveryEntries(
  posts: PublicSummary[],
  origin: string,
): MetadataRoute.Sitemap {
  const entries = new Map<string, MetadataRoute.Sitemap[number]>();
  for (const post of posts) {
    const url = `${origin}/posts/${post.slug}`;
    entries.set(url, { url, lastModified: post.updatedAt });
    const paths = [
      `/categories/${post.category.slug}`,
      ...post.tags.map((tag) => `/tags/${tag.slug}`),
      `/authors/${post.author.handle}`,
    ];
    for (const path of paths) {
      const url = `${origin}${path}`;
      entries.set(url, { url });
    }
  }
  return [...entries.values()];
}
