import { readStaffAccess, StaffAccessUnavailable } from '@/features/auth/staff-access';
import { ReviewQueue } from '@/features/review/review-queue';
export default async function ReviewPage() {
  const access = await readStaffAccess('/studio/review', ['EDITOR', 'ADMIN']);
  if (access.denied) return <StaffAccessUnavailable reason={access.denied} />;
  return <ReviewQueue key={access.member.id} />;
}
