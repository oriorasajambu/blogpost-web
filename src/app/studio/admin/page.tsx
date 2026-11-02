import { readStaffAccess, StaffAccessUnavailable } from '@/features/auth/staff-access';
import Link from 'next/link';
export default async function AdministrationAccessPage() {
  const access = await readStaffAccess('/studio/admin', ['ADMIN']);
  if (access.denied) return <StaffAccessUnavailable reason={access.denied} />;
  return (
    <section className="auth-panel">
      <p className="eyebrow">Administrator access</p>
      <h1>Staff access administration</h1>
      <p>
        Your role permits staff administration. Invitation and membership management is not
        available here yet.
      </p>
      <Link className="text-link" href="/studio/posts" prefetch={false}>
        Return to your workspace
      </Link>
    </section>
  );
}
