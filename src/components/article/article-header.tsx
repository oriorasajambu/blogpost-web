import { ReadingLink as Link } from '@/components/layout/reading-link';
import { formatDate, type ReadingPost } from './article-card';
import { ShareButton } from './share-button';
import { MediaImage } from './media-image';
import { Icon } from '@/components/ui/icon';

export function ArticleHeader({ post, minutes }: { post: ReadingPost; minutes?: number }) {
  return (
    <header className="article-header">
      {post.category && (
        <Link className="eyebrow" href={`/categories/${encodeURIComponent(post.category.slug)}`}>
          {post.category.name}
        </Link>
      )}
      <h1>{post.title}</h1>
      <p className="article-deck">{post.summary}</p>
      <div className="article-header-bottom">
        <div className="author-block">
          <span className="author-avatar" aria-hidden="true">
            {post.author.displayName.charAt(0)}
          </span>
          <div>
            <Link
              href={`/authors/${encodeURIComponent(post.author.handle)}`}
              className="author-name"
            >
              {post.author.displayName}
            </Link>
            <p>
              <time dateTime={post.firstPublishedAt}>{formatDate(post.firstPublishedAt)}</time>
              {post.updatedAt && post.updatedAt !== post.firstPublishedAt && (
                <span>
                  {' '}
                  · Updated <time dateTime={post.updatedAt}>{formatDate(post.updatedAt)}</time>
                </span>
              )}
              {minutes !== undefined && (
                <span className="reading-time">
                  <span aria-hidden="true">·</span>
                  <Icon name="clock" size={14} />
                  {minutes} min read
                </span>
              )}
            </p>
          </div>
        </div>
        <ShareButton title={post.title} />
      </div>
      {post.coverImage && (
        <figure className="article-cover">
          <MediaImage
            src={post.coverImage.src}
            alt={post.coverImage.alt}
            width={post.coverImage.width}
            height={post.coverImage.height}
            srcSet={post.coverImage.srcSet}
            sizes="(max-width: 48rem) calc(100vw - 2rem), 72rem"
            loading="eager"
          />
        </figure>
      )}
    </header>
  );
}

export function ArticleTags({ tags = [] }: { tags?: ReadingPost['tags'] }) {
  if (!tags.length) return null;
  return (
    <nav className="article-tags" aria-label="Article tags">
      <span>Filed under</span>
      {tags.map((tag) => (
        <Link key={tag.slug} href={`/tags/${encodeURIComponent(tag.slug)}`}>
          {tag.name}
        </Link>
      ))}
    </nav>
  );
}
