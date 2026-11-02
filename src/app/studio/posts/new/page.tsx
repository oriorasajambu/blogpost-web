import {
  readStaffAccess,
  staffNamespace,
  StaffAccessUnavailable,
} from '@/features/auth/staff-access';
import { DraftEditor } from '@/features/editor/draft-editor';
import packageInfo from '../../../../../package.json';

export default async function NewDraftPage({
  searchParams,
}: {
  searchParams: Promise<{ local?: string | string[] }>;
}) {
  const access = await readStaffAccess('/studio/posts/new');
  if (access.denied) return <StaffAccessUnavailable reason={access.denied} />;
  const local = (await searchParams).local;
  return (
    <DraftEditor
      member={access.member}
      namespace={staffNamespace()}
      appVersion={packageInfo.version}
      localId={typeof local === 'string' ? local : undefined}
    />
  );
}
