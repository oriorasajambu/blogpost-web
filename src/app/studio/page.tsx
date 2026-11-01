import { redirect } from 'next/navigation';
import { readStaffAccess, StaffAccessUnavailable } from '@/features/auth/staff-access';
export default async function StudioPage() {
  const access = await readStaffAccess('/studio/posts');
  if (access.denied) return <StaffAccessUnavailable reason={access.denied} />;
  redirect('/studio/posts');
}
