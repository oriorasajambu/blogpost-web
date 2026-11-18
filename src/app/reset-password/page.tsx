import type { Metadata } from 'next';
import { EmptyState } from '@/components/ui/empty-state';
import { getConfig } from '@/lib/config';
import { resetCodePattern } from '@/lib/auth-contract';
import { ResetPasswordPanel } from '@/features/auth/recovery-forms';

export const metadata: Metadata = {
  title: 'Choose a new password',
  robots: { index: false, follow: false },
};
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!getConfig().loginEnabled)
    return (
      <EmptyState
        headingLevel={1}
        title="Password reset is not enabled yet."
        description="The journal is open to everyone. Accounts for the staff workspace are not available yet."
        actionHref="/"
        actionLabel="Read the journal"
      />
    );
  const { code, set } = await searchParams;
  const value = typeof code === 'string' && resetCodePattern.test(code) ? code : undefined;
  return <ResetPasswordPanel code={value} setup={set === '1'} />;
}
