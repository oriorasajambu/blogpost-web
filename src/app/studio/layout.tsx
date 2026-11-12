import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
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
/** A bare brand bar for access states, which render outside the Studio shell. */
function StudioBrandBar() {
  return (
    <div className="flex min-h-16 items-center gap-2.5 border-b border-hairline px-4 sm:px-8">
      <Link
        href="/"
        prefetch={false}
        className="text-[1.1875rem] font-semibold tracking-[-0.02em] text-text no-underline hover:text-text"
      >
        blogpost<span className="text-accent">.</span>
      </Link>
      <span className="inline-flex h-5 items-center rounded-full bg-tag-bg px-2 text-[0.6875rem] font-medium text-tag-ink">
        Studio
      </span>
    </div>
  );
}
export default async function StudioLayout({ children }: { children: ReactNode }) {
  const access = await readStaffAccess('/studio/posts');
  if (access.denied)
    return (
      <>
        <StudioBrandBar />
        <div className="px-4 sm:px-8">
          <StaffAccessUnavailable reason={access.denied} />
        </div>
      </>
    );
  const namespace = staffNamespace();
  const { displayName, role } = access.member;
  return (
    <StaffSessionBoundary
      key={`${access.member.id}:${role}`}
      namespace={namespace}
      member={access.member}
    >
      <div className="staff-shell flex min-h-dvh flex-col md:flex-row">
        <StaffRail items={staffNavigation(role)}>
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              aria-hidden="true"
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-tag-bg text-xs font-semibold text-tag-ink"
            >
              {initials(displayName)}
            </span>
            <p className="staff-shell-header m-0 min-w-0 text-muted [overflow-wrap:anywhere]">
              <span className="sr-only">Signed in as </span>
              <strong className="block truncate text-sm font-medium text-text">
                {displayName}
              </strong>
              <span className="sr-only"> · </span>
              {role.toLowerCase()}
            </p>
          </div>
          <SignOutButton namespace={namespace} accountId={access.member.id} />
        </StaffRail>
        <div className="staff-main min-w-0 flex-1 px-4 pt-4 pb-16 sm:px-8 md:pt-8 lg:px-10">
          <div className="mx-auto w-full max-w-[76rem]">{children}</div>
        </div>
      </div>
    </StaffSessionBoundary>
  );
}
function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts.at(-1)![0] : '')).toUpperCase() || '·';
}
