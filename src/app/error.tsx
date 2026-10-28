'use client';
import { EmptyState } from '@/components/ui/empty-state';
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div role="alert">
      <EmptyState
        title="The journal is temporarily unavailable."
        description="We couldn’t load this page. Please try again in a moment."
      />
      <div className="error-actions">
        <button className="button-primary" onClick={reset}>
          Try again
        </button>
      </div>
    </div>
  );
}
