import { readStaffAccess, StaffAccessUnavailable } from '@/features/auth/staff-access';
export default async function StaffProfilePage() {
  const access = await readStaffAccess('/studio/profile');
  if (access.denied) return <StaffAccessUnavailable reason={access.denied} />;
  const member = access.member;
  return (
    <section className="auth-panel" aria-labelledby="profile-heading">
      <p className="eyebrow">Your account</p>
      <h1 id="profile-heading">Your staff profile</h1>
      <dl className="staff-profile">
        <dt>Display name</dt>
        <dd>{member.displayName}</dd>
        <dt>Public handle</dt>
        <dd>{member.handle}</dd>
        <dt>Public biography</dt>
        <dd>{member.bio || 'No biography added.'}</dd>
        <dt>Staff role</dt>
        <dd>{member.role.toLowerCase()}</dd>
        <dt>Private sign-in email</dt>
        <dd>{member.email}</dd>
      </dl>
      <p className="field-label">
        Your sign-in email is staff account information. It is not part of your public author
        profile.
      </p>
    </section>
  );
}
