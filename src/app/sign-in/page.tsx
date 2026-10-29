import type { Metadata } from 'next';
import { EmptyState } from '@/components/ui/empty-state';
export const metadata: Metadata = {
  title: 'Staff access',
  robots: { index: false, follow: false },
};
export default function SignIn() {
  return (
    <EmptyState
      headingLevel={1}
      title="Staff sign-in is not enabled yet."
      description="The journal is open to everyone. The invited staff workspace is being developed in the next stage."
      actionHref="/"
      actionLabel="Read the journal"
    />
  );
}
