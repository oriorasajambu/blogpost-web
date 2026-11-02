import {
  readStaffAccess,
  staffNamespace,
  StaffAccessUnavailable,
} from '@/features/auth/staff-access';
import { DraftList } from '@/features/editor/draft-list';
export default async function StaffPostsPage() {
  const access = await readStaffAccess('/studio/posts');
  if (access.denied) return <StaffAccessUnavailable reason={access.denied} />;
  return (
    <section aria-labelledby="workspace-heading">
      <p className="eyebrow">Staff workspace</p>
      <h1 id="workspace-heading">Your staff workspace</h1>
      <p>
        Welcome, {access.member.displayName}. Your account has {access.member.role.toLowerCase()}{' '}
        access.
      </p>
      <DraftList member={access.member} namespace={staffNamespace()} />
    </section>
  );
}
