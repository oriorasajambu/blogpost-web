import { eyebrow, studio } from '@/components/ui/styles';
import {
  readStaffAccess,
  staffNamespace,
  StaffAccessUnavailable,
} from '@/features/auth/staff-access';
import { DraftList } from '@/features/editor/draft-list';
import { StaffPostList } from '@/features/staff/post-list';
import { postFilters } from '@/features/staff/post-list-policy';
export default async function StaffPostsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await readStaffAccess('/studio/posts');
  if (access.denied) return <StaffAccessUnavailable reason={access.denied} />;
  return (
    <section className={studio.workspace} aria-labelledby="workspace-heading">
      <p className={eyebrow}>Staff workspace</p>
      <h1 id="workspace-heading">Your staff workspace</h1>
      <p>
        Welcome, {access.member.displayName}. Your account has {access.member.role.toLowerCase()}{' '}
        access.
      </p>
      <DraftList member={access.member} namespace={staffNamespace()} />
      {access.member.role !== 'AUTHOR' && (
        <StaffPostList memberId={access.member.id} filters={postFilters(await searchParams)} />
      )}
    </section>
  );
}
