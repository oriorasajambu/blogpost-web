import Link from 'next/link';
import { Icon } from './icon';

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
    <nav className="pagination" aria-label="Article pagination">
      <div>
        {page > 1 && (
          <Link href={href(page - 1)} className="text-link">
            <span className="arrow-back">
              <Icon name="arrow" size={17} />
            </span>{' '}
            Newer stories
          </Link>
        )}
      </div>
      <span aria-current="page">Page {page}</span>
      <div>
        {hasMore && (
          <Link href={href(page + 1)} className="text-link">
            Older stories <Icon name="arrow" size={17} />
          </Link>
        )}
      </div>
    </nav>
  );
}
