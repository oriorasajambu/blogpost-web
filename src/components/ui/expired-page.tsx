import { EmptyState } from './empty-state';

export function ExpiredPage({ basePath }: { basePath: string }) {
  return (
    <EmptyState
      headingLevel={1}
      title="This page link has expired."
      description="Return to the latest stories to continue reading."
      actionHref={basePath}
      actionLabel="Back to latest stories"
    />
  );
}
