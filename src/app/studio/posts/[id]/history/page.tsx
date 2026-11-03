import { notFound } from 'next/navigation';
import { readStaffAccess, StaffAccessUnavailable } from '@/features/auth/staff-access';
import { RevisionHistory } from '@/features/review/revision-history';
import { resourceUuidPattern } from '@/lib/request-policy';
export default async function RevisionHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await readStaffAccess(`/studio/posts/${id}/history`);
  if (access.denied) return <StaffAccessUnavailable reason={access.denied} />;
  if (!resourceUuidPattern.test(id)) notFound();
  return <RevisionHistory key={`${access.member.id}:${id}`} postId={id} />;
}
