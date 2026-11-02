import { readStaffAccess, StaffAccessUnavailable } from '@/features/auth/staff-access';
import { TrashWorkspace } from '@/features/review/trash-workspace';
export default async function TrashPage() {
  const access = await readStaffAccess('/studio/trash');
  if (access.denied) return <StaffAccessUnavailable reason={access.denied} />;
  return <TrashWorkspace key={access.member.id} member={access.member} />;
}
