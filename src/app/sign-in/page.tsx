import type { Metadata } from 'next';
import { EmptyState } from '@/components/ui/empty-state';
import { getConfig } from '@/lib/config';
import { AuthPanel } from '@/features/auth/auth-panel';
import { staffNamespace } from '@/features/auth/staff-access';
import { safeReturnTo } from '@/lib/auth-navigation';
export const metadata: Metadata = {
  title: 'Staff access',
  robots: { index: false, follow: false },
};
export default async function SignIn({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const config = getConfig();
  const params = await searchParams;
  if (config.loginEnabled)
    return (
      <AuthPanel
        namespace={staffNamespace()}
        returnTo={safeReturnTo(params.returnTo)}
        redirectReturn={params.oauth === 'return'}
      />
    );
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
