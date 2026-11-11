import { ReadingLink as Link } from '@/components/layout/reading-link';
import { Icon } from '@/components/ui/icon';
import { eyebrow } from '@/components/ui/styles';
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

const coverFrame =
  'overflow-hidden bg-raised [&_img]:size-full [&_img]:object-cover [&_img]:[mix-blend-mode:var(--image-blend)] [&_img]:[filter:var(--image-dim)] [&_.media-unavailable]:h-full [&_.media-unavailable]:rounded-none [&_.media-unavailable]:border-0';

/** Image-less stories get a tinted panel naming their category; it repeats the kicker, so it is hidden from assistive tech. */
function CoverFallback({ label, className }: { label: string; className: string }) {
  return (
    <div
      aria-hidden="true"
      className={`${className} flex items-end bg-[linear-gradient(160deg,var(--color-accent-tint),var(--color-raised)_70%)] p-4`}
    >
      <span className="line-clamp-2 text-sm font-medium tracking-[0.02em] text-accent-ink">
        {label}
      </span>
    </div>
  );
}

export function ArticleCard({ post, featured = false }: { post: ReadingPost; featured?: boolean }) {
  const href = `/posts/${encodeURIComponent(post.slug)}`;
  const kicker = post.category ? (
    <Link href={`/categories/${encodeURIComponent(post.category.slug)}`} className={eyebrow}>
      {post.category.name}
    </Link>
  ) : (
    <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
      Stories & perspectives
    </span>
  );
  const byline = (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[0.8125rem] text-muted">
      <Link
        href={`/authors/${encodeURIComponent(post.author.handle)}`}
        className="text-text no-underline hover:text-accent-ink"
      >
        {post.author.displayName}
      </Link>
      <span aria-hidden="true">·</span>
      <time dateTime={post.firstPublishedAt}>{formatDate(post.firstPublishedAt)}</time>
    </div>
  );
  const readLink = (
    <Link
      href={href}
      className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-accent-ink no-underline transition-colors hover:bg-accent-tint"
      aria-label={`Read ${post.title}`}
    >
      <span className="max-sm:hidden">Read story</span>
      <Icon name="arrow" size={18} />
    </Link>
  );
  const cover = post.coverImage ? (
    <MediaImage
      src={post.coverImage.src}
      alt={post.coverImage.alt}
      width={post.coverImage.width}
      height={post.coverImage.height}
      srcSet={post.coverImage.srcSet}
      sizes={
        featured
          ? '(max-width: 48rem) calc(100vw - 2rem), 42rem'
          : '(max-width: 48rem) calc(100vw - 2rem), 36rem'
      }
      loading={featured ? 'eager' : 'lazy'}
    />
  ) : null;

  if (featured)
    return (
      <article
        className={`grid overflow-hidden rounded-[14px] bg-surface shadow-[0_0_0_1px_var(--color-hairline)] ${cover ? 'md:grid-cols-[7fr_5fr]' : ''}`}
      >
        {cover && (
          <div className={`${coverFrame} aspect-[16/10] md:aspect-auto md:min-h-[24rem]`}>
            {cover}
          </div>
        )}
        <div
          className={`flex min-w-0 flex-col justify-center gap-4 p-6 sm:p-10 ${cover ? '' : 'max-w-[52rem]'}`}
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="inline-flex h-6 items-center rounded-full bg-tag-bg px-2.5 text-xs font-medium text-tag-ink">
              The latest story
            </span>
            {kicker}
          </div>
          <h2 className="line-clamp-4 text-[1.75rem] leading-[1.15] tracking-[-0.015em] sm:text-[2.25rem]">
            <Link href={href} className="text-text no-underline hover:text-accent-ink">
              {post.title}
            </Link>
          </h2>
          <p className="line-clamp-3 text-base text-muted">{post.summary}</p>
          {!cover && (
            <span className="block h-px w-[72px] bg-accent shadow-glow" aria-hidden="true" />
          )}
          <div className="mt-2 flex items-center justify-between gap-4">
            {byline}
            {readLink}
          </div>
        </div>
      </article>
    );

  return (
    <article className="group flex min-w-0 flex-col gap-3.5">
      {cover ? (
        <div className={`${coverFrame} aspect-[16/9] rounded-[10px]`}>{cover}</div>
      ) : (
        <CoverFallback
          label={post.category?.name ?? 'Stories & perspectives'}
          className="aspect-[16/9] rounded-[10px]"
        />
      )}
      <div>{kicker}</div>
      <h2 className="line-clamp-3 text-[1.3125rem] leading-[1.3]">
        <Link href={href} className="text-text no-underline hover:text-accent-ink">
          {post.title}
        </Link>
      </h2>
      <p className="line-clamp-2 text-sm text-muted">{post.summary}</p>
      <div className="mt-auto flex items-center justify-between gap-3">
        {byline}
        {readLink}
      </div>
    </article>
  );
}

export function ArticleList({ posts }: { posts: ReadingPost[] }) {
  return (
    <div className="grid gap-x-8 gap-y-12 md:grid-cols-2">
      {posts.map((post) => (
        <ArticleCard key={post.id} post={post} />
      ))}
    </div>
  );
}
