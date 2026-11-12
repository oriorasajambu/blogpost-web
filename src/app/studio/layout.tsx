import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import {
  readStaffAccess,
  StaffAccessUnavailable,
  staffNamespace,
} from '@/features/auth/staff-access';
import { staffNavigation } from '@/lib/auth-navigation';
import { StaffSessionBoundary } from '@/features/auth/staff-session-boundary';
import { SignOutButton } from '@/features/auth/sign-out-button';
import { StaffRail } from '@/features/staff/staff-rail';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Staff workspace',
  robots: { index: false, follow: false },
};
export default async function StudioLayout({ children }: { children: ReactNode }) {
  const access = await readStaffAccess('/studio/posts');
  if (access.denied) return <StaffAccessUnavailable reason={access.denied} />;
  const namespace = staffNamespace();
  return (
    <StaffSessionBoundary
      key={`${access.member.id}:${access.member.role}`}
      namespace={namespace}
      member={access.member}
    >
      <div className="staff-shell my-6 flex flex-col gap-4 md:flex-row md:items-start md:gap-10">
        <StaffRail items={staffNavigation(access.member.role)}>
          <p className="staff-shell-header m-0 text-muted [overflow-wrap:anywhere] [&_strong]:font-medium [&_strong]:text-text">
            Signed in as <strong>{access.member.displayName}</strong> ·{' '}
            {access.member.role.toLowerCase()}
          </p>
          <SignOutButton namespace={namespace} accountId={access.member.id} />
        </StaffRail>
        <div className="staff-main min-w-0 flex-1">{children}</div>
      </div>
    </StaffSessionBoundary>
  );
}
