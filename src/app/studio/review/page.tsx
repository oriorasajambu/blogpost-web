import { readStaffAccess, StaffAccessUnavailable } from '@/features/auth/staff-access';
import Link from 'next/link';
export default async function ReviewAccessPage() {
  const access = await readStaffAccess('/studio/review', ['EDITOR', 'ADMIN']);
  if (access.denied) return <StaffAccessUnavailable reason={access.denied} />;
  return (
    <section className="auth-panel">
      <p className="eyebrow">Editorial access</p>
      <h1>Review workspace</h1>
      <p>Your role permits editorial review. The review queue is not available here yet.</p>
      <Link className="text-link" href="/studio/posts" prefetch={false}>
        Return to your workspace
      </Link>
    </section>
  );
}
