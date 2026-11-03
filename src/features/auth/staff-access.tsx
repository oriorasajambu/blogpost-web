import 'server-only';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ApiError } from '@/lib/api-server';
import { BackendResponseError } from '@/lib/bff';
import { getConfig } from '@/lib/config';
import { getStaffMember } from '@/lib/session';
import type { StaffMember, StaffRole } from '@/lib/auth-contract';
import { safeReturnTo } from '@/lib/auth-navigation';
import { SignOutButton } from './sign-out-button';

export function staffNamespace() {
  const config = getConfig();
  return config.environment === 'development'
    ? `blogpost:${config.stackId}:staff`
    : 'blogpost:staff';
}
export type StaffAccess =
  { member: StaffMember; denied: false } | { member: null; denied: 'role' | 'account' };

/** Every protected page calls this function; a previously loaded layout is not an authorization boundary. */
export async function readStaffAccess(path: string, roles?: StaffRole[]): Promise<StaffAccess> {
  try {
    const member = await getStaffMember();
    if (!member) redirect(`/sign-in?returnTo=${encodeURIComponent(safeReturnTo(path))}`);
    if (roles && !roles.includes(member.role)) return { member: null, denied: 'role' };
    return { member, denied: false };
  } catch (error) {
    if (
      (error instanceof ApiError || error instanceof BackendResponseError) &&
      error.status === 403
    )
      return { member: null, denied: 'account' };
    throw error;
  }
}
export function StaffAccessUnavailable({ reason }: { reason: 'role' | 'account' }) {
  return (
    <section className="auth-panel" aria-labelledby="staff-access-heading">
      <p className="eyebrow">Staff access</p>
      <h1 id="staff-access-heading">
        {reason === 'role'
          ? 'This area is not available for your role.'
          : 'Staff access is unavailable.'}
      </h1>
      <p>
        {reason === 'role'
          ? 'Your account can still use its authorized workspace. Ask an administrator if your responsibilities have changed.'
          : 'This account no longer has active staff access. Local work has been kept so you can review or export it before signing out.'}
      </p>
      {reason === 'role' && (
        <Link className="text-link" href="/studio/posts" prefetch={false}>
          Return to your workspace
        </Link>
      )}
      <SignOutButton
        namespace={staffNamespace()}
        destination="/sign-in"
        label="Review local work and sign out"
      />
    </section>
  );
}
