export function ArticleSkeleton({ announce = true }: { announce?: boolean }) {
  return (
    <div
      role={announce ? 'status' : undefined}
      aria-label={announce ? 'Loading articles' : undefined}
      aria-hidden={!announce || undefined}
    >
      {announce && <span className="sr-only">Loading articles…</span>}
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
