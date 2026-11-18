import type { Metadata } from 'next';
import { EmptyState } from '@/components/ui/empty-state';
import { getConfig } from '@/lib/config';
import { ForgotPasswordPanel } from '@/features/auth/recovery-forms';

export const metadata: Metadata = {
  title: 'Forgot your password',
  robots: { index: false, follow: false },
};
export default function ForgotPasswordPage() {
  return getConfig().loginEnabled ? (
    <ForgotPasswordPanel />
  ) : (
    <EmptyState
      headingLevel={1}
      title="Password reset is not enabled yet."
      description="The journal is open to everyone. Accounts for the staff workspace are not available yet."
      actionHref="/"
      actionLabel="Read the journal"
    />
  );
}
