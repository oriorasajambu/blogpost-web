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
import '@/features/auth/auth.css';
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
    <StaffSessionBoundary namespace={namespace} member={access.member}>
      <div className="staff-shell">
        <div className="staff-shell-header">
          <p>
            Signed in as <strong>{access.member.displayName}</strong> ·{' '}
            {access.member.role.toLowerCase()}
          </p>
          <SignOutButton namespace={namespace} accountId={access.member.id} />
        </div>
        <nav className="staff-navigation" aria-label="Staff navigation">
          {staffNavigation(access.member.role).map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
        {children}
      </div>
    </StaffSessionBoundary>
  );
}
