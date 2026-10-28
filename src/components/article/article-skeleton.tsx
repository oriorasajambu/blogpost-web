export function ArticleSkeleton() {
  return (
    <div role="status" aria-label="Loading articles">
      <span className="sr-only">Loading articles…</span>
      {Array.from({ length: 3 }, (_, index) => (
        <div className="loading-card" aria-hidden="true" key={index}>
          <div className="skeleton skeleton-short" />
          <div className="skeleton skeleton-title" />
          <div className="skeleton" />
          <div className="skeleton skeleton-short" />
        </div>
      ))}
    </div>
  );
}
