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
import '@/features/auth/auth.css';
import '@/features/staff/staff.css';
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
      <div className="staff-shell">
        <StaffRail items={staffNavigation(access.member.role)}>
          <p className="staff-shell-header">
            Signed in as <strong>{access.member.displayName}</strong> ·{' '}
            {access.member.role.toLowerCase()}
          </p>
          <SignOutButton namespace={namespace} accountId={access.member.id} />
        </StaffRail>
        <div className="staff-main">{children}</div>
      </div>
    </StaffSessionBoundary>
  );
}
