import { readStaffAccess, StaffAccessUnavailable } from '@/features/auth/staff-access';
import { TaxonomyWorkspace } from '@/features/taxonomy/taxonomy-workspace';
export default async function TaxonomyAccessPage() {
  const access = await readStaffAccess('/studio/taxonomy', ['EDITOR', 'ADMIN']);
  if (access.denied) return <StaffAccessUnavailable reason={access.denied} />;
  return <TaxonomyWorkspace />;
}
