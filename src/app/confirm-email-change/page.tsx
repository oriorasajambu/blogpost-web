import type { Metadata } from 'next';
import { EmptyState } from '@/components/ui/empty-state';
import { getConfig } from '@/lib/config';
import { resetCodePattern } from '@/lib/auth-contract';
import { ConfirmEmailChangePanel } from '@/features/auth/recovery-forms';

export const metadata: Metadata = {
  title: 'Confirm your new email',
  robots: { index: false, follow: false },
};
export default async function ConfirmEmailChangePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!getConfig().loginEnabled)
    return (
      <EmptyState
        headingLevel={1}
        title="Email changes are not enabled yet."
        description="The journal is open to everyone. Accounts for the staff workspace are not available yet."
        actionHref="/"
        actionLabel="Read the journal"
      />
    );
  const { code } = await searchParams;
  const value = typeof code === 'string' && resetCodePattern.test(code) ? code : undefined;
  return <ConfirmEmailChangePanel code={value} />;
}
