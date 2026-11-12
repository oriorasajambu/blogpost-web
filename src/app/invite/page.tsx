import type { Metadata } from 'next';
import { getConfig } from '@/lib/config';
import { AuthPanel } from '@/features/auth/auth-panel';
import { staffNamespace } from '@/features/auth/staff-access';
import { EmptyState } from '@/components/ui/empty-state';
export const metadata: Metadata = {
  title: 'Staff invitation',
  robots: { index: false, follow: false },
};
export default function InvitationPage() {
  return getConfig().loginEnabled ? (
    <AuthPanel namespace={staffNamespace()} invitation />
  ) : (
    <EmptyState
      headingLevel={1}
      title="Staff sign-in is not enabled yet."
      description="Your invitation can be accepted when staff access is enabled for this website."
      actionHref="/"
      actionLabel="Read the journal"
    />
  );
}
