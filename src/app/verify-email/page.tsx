import type { Metadata } from 'next';
import { EmptyState } from '@/components/ui/empty-state';
import { getConfig } from '@/lib/config';
import { VerifyEmailPanel } from '@/features/auth/account-forms';

export const metadata: Metadata = {
  title: 'Verify your email',
  robots: { index: false, follow: false },
};
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!getConfig().loginEnabled)
    return (
      <EmptyState
        headingLevel={1}
        title="Email verification is not enabled yet."
        description="The journal is open to everyone. Accounts for the staff workspace are not available yet."
        actionHref="/"
        actionLabel="Read the journal"
      />
    );
  const { code } = await searchParams;
  // One-time codes are short URL-safe tokens; anything else is treated as absent.
  const value = typeof code === 'string' && /^[A-Za-z0-9_-]{16,512}$/.test(code) ? code : undefined;
  return <VerifyEmailPanel code={value} />;
}
