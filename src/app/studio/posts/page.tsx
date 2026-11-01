import { readStaffAccess, StaffAccessUnavailable } from '@/features/auth/staff-access';
export default async function StaffPostsPage() {
  const access = await readStaffAccess('/studio/posts');
  if (access.denied) return <StaffAccessUnavailable reason={access.denied} />;
  return (
    <section className="auth-panel" aria-labelledby="workspace-heading">
      <p className="eyebrow">Staff workspace</p>
      <h1 id="workspace-heading">Your staff workspace</h1>
      <p>
        Welcome, {access.member.displayName}. Your account has {access.member.role.toLowerCase()}{' '}
        access.
      </p>
      <p>
        Writing and editing are not available here yet. You can review your staff profile or return
        to the journal.
      </p>
      <a className="text-link" href="/studio/profile">
        View your staff profile
      </a>
    </section>
  );
}
