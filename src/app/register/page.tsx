import type { Metadata } from 'next';
import { EmptyState } from '@/components/ui/empty-state';
import { getConfig } from '@/lib/config';
import { RegisterForm } from '@/features/auth/account-forms';

export const metadata: Metadata = {
  title: 'Create an account',
  robots: { index: false, follow: false },
};
export default function RegisterPage() {
  return getConfig().loginEnabled ? (
    <RegisterForm />
  ) : (
    <EmptyState
      headingLevel={1}
      title="Registration is not enabled yet."
      description="The journal is open to everyone. Accounts for the staff workspace are not available yet."
      actionHref="/"
      actionLabel="Read the journal"
    />
  );
}
