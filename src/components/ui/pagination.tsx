import { ReadingLink as Link } from '@/components/layout/reading-link';
import { Icon } from './icon';
import { buttonGhost, buttonPrimary } from './styles';

export function Pagination({
  page,
  hasMore,
  basePath,
  query = {},
}: {
  page: number;
  hasMore: boolean;
  basePath: string;
  query?: Record<string, string>;
}) {
  if (page === 1 && !hasMore) return null;
  function href(target: number) {
    const params = new URLSearchParams(query);
    if (target > 1) params.set('page', String(target));
    else params.delete('page');
    return `${basePath}${params.size ? `?${params}` : ''}`;
  }
  return (
    <nav
      className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-10 text-[0.8125rem] text-muted sm:gap-4"
      aria-label="Article pagination"
    >
      <div>
        {page > 1 && (
          <Link href={href(page - 1)} className={`${buttonGhost} px-2 sm:px-4`}>
            <Icon name="arrow-left" size={16} /> Newer stories
          </Link>
        )}
      </div>
      <span aria-current="page">Page {page}</span>
      <div className="text-right">
        {hasMore && (
          <Link href={href(page + 1)} className={`${buttonPrimary} px-2 sm:px-4`}>
            Older stories <Icon name="arrow" size={16} />
          </Link>
        )}
      </div>
    </nav>
  );
}

/** Cursor feeds only move forward: a way back to the first page and a link to older stories. */
export function CursorPagination({
  basePath,
  nextCursor,
  showBack,
}: {
  basePath: string;
  nextCursor?: string | null;
  showBack: boolean;
}) {
  if (!showBack && !nextCursor) return null;
  return (
    <nav
      className="flex flex-wrap items-center justify-between gap-3 py-10"
      aria-label="Article pagination"
    >
      <div>
        {showBack && (
          <Link className={buttonGhost} href={basePath}>
            Back to latest
          </Link>
        )}
      </div>
      {nextCursor && (
        <Link
          className={buttonPrimary}
          href={`${basePath === '/' ? '/' : ''}?cursor=${encodeURIComponent(nextCursor)}`}
        >
          Older stories <Icon name="arrow" size={16} />
        </Link>
      )}
    </nav>
  );
}
