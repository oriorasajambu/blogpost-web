import { notFound } from 'next/navigation';
import { readStaffAccess, StaffAccessUnavailable } from '@/features/auth/staff-access';
import { ReviewDetail } from '@/features/review/review-detail';
import { resourceUuidPattern } from '@/lib/request-policy';
export default async function ReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await readStaffAccess(`/studio/review/${id}`, ['EDITOR', 'ADMIN']);
  if (access.denied) return <StaffAccessUnavailable reason={access.denied} />;
  if (!resourceUuidPattern.test(id)) notFound();
  return <ReviewDetail key={`${access.member.id}:${id}`} postId={id} />;
}
