import { readStaffAccess, StaffAccessUnavailable } from '@/features/auth/staff-access';
import { ProfileForm } from '@/features/profile/profile-form';
import { SecuritySection } from '@/features/profile/security-section';
export default async function StaffProfilePage() {
  const access = await readStaffAccess('/studio/profile');
  if (access.denied) return <StaffAccessUnavailable reason={access.denied} />;
  return (
    <>
      <ProfileForm key={access.member.id} initial={access.member} />
      <SecuritySection key={`security-${access.member.id}`} email={access.member.email} />
    </>
  );
}
