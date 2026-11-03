import { ReadingLink as Link } from './reading-link';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div>
          <Link href="/" className="brand">
            blogpost<span className="brand-dot">.</span>
          </Link>
          <p>A little perspective. A lot to discover.</p>
        </div>
        <div className="footer-links">
          <Link href="/">Latest stories</Link>
          <Link href="/search">Explore the archive</Link>
          <span>Made for a good read.</span>
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
    <div className="environment-banner" role="status">
      <span className="environment-dot" aria-hidden="true" />
      {environment === 'staging'
        ? 'Staging · Synthetic content for testing'
        : 'Development · Local workspace'}
    </div>
  );
}
