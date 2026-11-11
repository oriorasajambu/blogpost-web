import { ReadingLink as Link } from './reading-link';
import { container } from '@/components/ui/styles';

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-hairline">
      <div
        className={`${container} flex flex-col gap-6 py-10 sm:flex-row sm:items-center sm:justify-between`}
      >
        <div className="flex flex-col gap-1.5">
          <Link
            href="/"
            className="text-base font-semibold tracking-[-0.02em] text-text no-underline hover:text-text"
          >
            blogpost<span className="text-accent">.</span>
          </Link>
          <p className="text-sm text-muted">A little perspective. A lot to discover.</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          <Link href="/" className="text-muted no-underline hover:text-text">
            Latest stories
          </Link>
          <Link href="/search" className="text-muted no-underline hover:text-text">
            Explore the archive
          </Link>
          <span className="text-faint max-sm:w-full">Made for a good read.</span>
        </div>
      </div>
    </footer>
  );
}

export function EnvironmentBanner({
  environment,
}: {
  environment: 'development' | 'staging' | 'production';
}) {
  if (environment === 'production') return null;
  return (
    <div
      className="flex min-h-[26px] items-center justify-center gap-2.5 bg-warning-bg px-4 py-1 text-center text-[0.6875rem] font-medium tracking-[0.06em] text-warning"
      role="status"
    >
      <span className="size-[5px] flex-none rounded-full bg-current" aria-hidden="true" />
      {environment === 'staging'
        ? 'Staging · Synthetic content for testing'
        : 'Development · Local workspace'}
    </div>
  );
}
