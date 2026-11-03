import { readStaffAccess, StaffAccessUnavailable } from '@/features/auth/staff-access';
import { ProfileForm } from '@/features/profile/profile-form';
export default async function StaffProfilePage() {
  const access = await readStaffAccess('/studio/profile');
  if (access.denied) return <StaffAccessUnavailable reason={access.denied} />;
  return <ProfileForm key={access.member.id} initial={access.member} />;
}
