import { notFound } from 'next/navigation';
import {
  readStaffAccess,
  staffNamespace,
  StaffAccessUnavailable,
} from '@/features/auth/staff-access';
import { DraftEditor } from '@/features/editor/draft-editor';
import packageInfo from '../../../../../package.json';

export default async function ExistingDraftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id)) notFound();
  const access = await readStaffAccess(`/studio/posts/${id}`);
  if (access.denied) return <StaffAccessUnavailable reason={access.denied} />;
  return (
    <DraftEditor
      member={access.member}
      namespace={staffNamespace()}
      appVersion={packageInfo.version}
      postId={id}
    />
  );
}
