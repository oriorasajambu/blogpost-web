'use client';
import { useTransition } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
export default function ErrorPage({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <div role="alert" className="error-state">
      <EmptyState
        headingLevel={1}
        title="The journal is temporarily unavailable."
        description="We couldn’t load this page. Please try again in a moment."
      />
      <div className="error-actions">
        <button
          className="button-primary"
          disabled={pending}
          onClick={() => startTransition(() => retry())}
        >
          {pending ? 'Trying again…' : 'Try again'}
        </button>
      </div>
    </div>
  );
}
