import { EmptyState } from '@/components/ui/empty-state';
export default function NotFound() {
  return (
    <EmptyState
      title="This story is unavailable."
      description="The page may have moved or the article may no longer be published."
      actionHref="/"
      actionLabel="Back to the journal"
    />
  );
}
