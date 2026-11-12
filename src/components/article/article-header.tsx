import { ReadingLink as Link } from '@/components/layout/reading-link';
import { formatDate, type ReadingPost } from './article-card';
import { ShareButton } from './share-button';
import { MediaImage } from './media-image';
import { Icon } from '@/components/ui/icon';
import { eyebrow } from '@/components/ui/styles';

export function ArticleHeader({ post, minutes }: { post: ReadingPost; minutes?: number }) {
  return (
    <header className="flex flex-col gap-5 pt-10 sm:pt-14">
      <div className="flex max-w-[54rem] flex-col gap-5">
        {post.category && (
          <Link
            className={`${eyebrow} self-start`}
            href={`/categories/${encodeURIComponent(post.category.slug)}`}
          >
            {post.category.name}
          </Link>
        )}
        <h1 className="text-title tracking-[-0.02em]">{post.title}</h1>
        <p className="max-w-[45rem] text-[1.0625rem] leading-relaxed text-muted sm:text-[1.1875rem]">
          {post.summary}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-y border-hairline py-4 sm:py-5">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="inline-flex size-10 flex-none items-center justify-center rounded-full bg-tag-bg text-sm font-semibold text-tag-ink max-sm:hidden"
            aria-hidden="true"
          >
            {post.author.displayName.charAt(0)}
          </span>
          <div className="min-w-0">
            <Link
              href={`/authors/${encodeURIComponent(post.author.handle)}`}
              className="text-sm font-medium text-text no-underline hover:text-accent-ink"
            >
              {post.author.displayName}
            </Link>
            <p className="flex flex-wrap items-center gap-x-1.5 text-[0.8125rem] text-muted">
              <time dateTime={post.firstPublishedAt}>{formatDate(post.firstPublishedAt)}</time>
              {post.updatedAt && post.updatedAt !== post.firstPublishedAt && (
                <span>
                  · Updated <time dateTime={post.updatedAt}>{formatDate(post.updatedAt)}</time>
                </span>
              )}
              {minutes !== undefined && (
                <span className="inline-flex items-center gap-1.5">
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
        <figure className="mt-3 overflow-hidden rounded-xl bg-raised max-sm:-mx-4 max-sm:rounded-none [&_img]:w-full [&_img]:[filter:var(--image-dim)] [&_img]:[mix-blend-mode:var(--image-blend)]">
          <MediaImage
            src={post.coverImage.src}
            alt={post.coverImage.alt}
            width={post.coverImage.width}
            height={post.coverImage.height}
            srcSet={post.coverImage.srcSet}
            sizes="(max-width: 48rem) 100vw, 74rem"
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
    <nav
      className="mt-12 flex max-w-[68ch] flex-wrap items-center gap-2 border-t border-hairline pt-6"
      aria-label="Article tags"
    >
      <span className="mr-2 text-xs font-medium uppercase tracking-[0.08em] text-faint">
        Filed under
      </span>
      {tags.map((tag) => (
        <Link
          key={tag.slug}
          href={`/tags/${encodeURIComponent(tag.slug)}`}
          className="inline-flex min-h-8 items-center rounded-full px-3 text-[0.8125rem] text-muted no-underline shadow-[inset_0_0_0_1px_var(--color-divider)] hover:transition-colors hover:bg-raised hover:text-text"
        >
          {tag.name}
        </Link>
      ))}
    </nav>
  );
}
