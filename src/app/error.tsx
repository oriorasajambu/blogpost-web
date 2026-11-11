'use client';
import { useTransition } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { buttonPrimary } from '@/components/ui/styles';
export default function ErrorPage({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <div role="alert">
      <EmptyState
        headingLevel={1}
        title="The journal is temporarily unavailable."
        description="We couldn’t load this page. Please try again in a moment."
      />
      <div className="-mt-10 flex pb-16 sm:-mt-14">
        <button
          className={buttonPrimary}
          disabled={pending}
          onClick={() => startTransition(() => retry())}
        >
          {pending ? 'Trying again…' : 'Try again'}
        </button>
      </div>
    </div>
  );
}
