import { readStaffAccess, StaffAccessUnavailable } from '@/features/auth/staff-access';
import Link from 'next/link';
export default async function TaxonomyAccessPage() {
  const access = await readStaffAccess('/studio/taxonomy', ['EDITOR', 'ADMIN']);
  if (access.denied) return <StaffAccessUnavailable reason={access.denied} />;
  return (
    <section className="auth-panel">
      <p className="eyebrow">Editorial access</p>
      <h1>Taxonomy workspace</h1>
      <p>
        Your role permits taxonomy management. Category and tag administration is not available here
        yet.
      </p>
      <Link className="text-link" href="/studio/posts" prefetch={false}>
        Return to your workspace
      </Link>
    </section>
  );
}
