import { readStaffAccess, StaffAccessUnavailable } from '@/features/auth/staff-access';
import { AdminWorkspace } from '@/features/members/admin-workspace';
import { getConfig } from '@/lib/config';
export default async function AdministrationAccessPage() {
  const access = await readStaffAccess('/studio/admin', ['ADMIN']);
  if (access.denied) return <StaffAccessUnavailable reason={access.denied} />;
  return (
    <AdminWorkspace
      key={access.member.id}
      accountId={access.member.id}
      webOrigin={getConfig().webOrigin ?? null}
    />
  );
}
