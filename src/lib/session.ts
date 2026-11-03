import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getConfig } from './config';
import { ApiError } from './api-server';
import { validateStaffMember, type StaffRole } from './auth-contract';
import { BackendResponseError, BffError } from './bff';
import { staffApi } from './staff-api';
import { safeReturnTo } from './auth-navigation';

export const getStaffMember = cache(async () => {
  const config = getConfig();
  if (!config.loginEnabled) return null;
  const session = (await cookies()).get(config.sessionCookie)?.value;
  if (!session) return null;
  try {
    const result = await staffApi('/v1/me', { session });
    const member = validateStaffMember(result.body.data);
    if (!member.active) throw new ApiError(403, 'ACCESS_REVOKED');
    return member;
  } catch (error) {
    if (error instanceof BffError && error.status === 401) return null;
    if (error instanceof BackendResponseError && error.status === 401) return null;
    throw error;
  }
});
export async function requireStaffMember(roles?: StaffRole[], returnTo = '/studio/posts') {
  const member = await getStaffMember();
  if (!member) redirect(`/sign-in?returnTo=${encodeURIComponent(safeReturnTo(returnTo))}`);
  if (roles && !roles.includes(member.role)) throw new ApiError(403, 'INSUFFICIENT_PERMISSION');
  return member;
}
export const getSessionMember = getStaffMember;
export const requireSessionMember = requireStaffMember;
