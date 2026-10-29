import { ReadingLink as Link } from '@/components/layout/reading-link';
import { Icon } from '@/components/ui/icon';
import { MediaImage } from './media-image';

export type ReadingPost = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  firstPublishedAt: string;
  updatedAt?: string;
  author: { displayName: string; handle: string };
  category?: { name: string; slug: string };
  tags?: Array<{ name: string; slug: string }>;
  coverImage?: { src: string; alt: string; width: number; height: number; srcSet?: string };
};

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value));
}

export function ArticleCard({
  post,
  featured = false,
  index,
}: {
  post: ReadingPost;
  featured?: boolean;
  index?: number;
}) {
  return (
    <article className={`article-card${featured ? ' article-card-featured' : ''}`}>
      <div className="card-content">
        <div className="card-kicker">
          {post.category ? (
            <Link href={`/categories/${encodeURIComponent(post.category.slug)}`}>
              {post.category.name}
            </Link>
          ) : (
            <span>Stories & perspectives</span>
          )}
          {featured && <span className="feature-label">The latest story</span>}
        </div>
        <h2>
          <Link href={`/posts/${encodeURIComponent(post.slug)}`}>{post.title}</Link>
        </h2>
        <p className="card-summary">{post.summary}</p>
        <div className="card-bottom">
          <div className="article-byline">
            <Link
              href={`/authors/${encodeURIComponent(post.author.handle)}`}
              className="author-name"
            >
              {post.author.displayName}
            </Link>
            <span aria-hidden="true">·</span>
            <time dateTime={post.firstPublishedAt}>{formatDate(post.firstPublishedAt)}</time>
          </div>
          <Link
            href={`/posts/${encodeURIComponent(post.slug)}`}
            className="read-link"
            aria-label={`Read ${post.title}`}
          >
            <span>Read story</span>
            <Icon name="arrow" size={20} />
          </Link>
        </div>
      </div>
      {post.coverImage ? (
        <div className="card-cover">
          <MediaImage
            src={post.coverImage.src}
            alt={post.coverImage.alt}
            width={post.coverImage.width}
            height={post.coverImage.height}
            srcSet={post.coverImage.srcSet}
            sizes={
              featured
                ? '(max-width: 48rem) calc(100vw - 2rem), 30rem'
                : '(max-width: 48rem) calc(100vw - 2rem), 14rem'
            }
            loading={featured ? 'eager' : 'lazy'}
          />
        </div>
      ) : featured ? (
        <div className="feature-art" aria-hidden="true">
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <div className="art-orbit orbit-three" />
          <div className="art-sun" />
          <span className="art-word">
            A moment
            <br />
            to reflect.
          </span>
          <span className="art-caption">A BLOGPOST PERSPECTIVE</span>
        </div>
      ) : null}
      {!featured && index !== undefined && (
        <span className="card-number" aria-hidden="true">
          {String(index + 1).padStart(2, '0')}
        </span>
      )}
    </article>
  );
}

export function ArticleList({ posts }: { posts: ReadingPost[] }) {
  return (
    <div className="article-list">
      {posts.map((post, index) => (
        <ArticleCard key={post.id} post={post} index={index} />
      ))}
    </div>
  );
}
