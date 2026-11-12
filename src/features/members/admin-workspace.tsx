import { eyebrow, studio } from '@/components/ui/styles';
import { MembersPanel } from './members-panel';
import { InvitationsPanel } from '@/features/invitations/invitations-panel';
import { ReassignmentPanel } from './reassignment-panel';
import { AuditPanel } from './audit-panel';

export function AdminWorkspace({
  accountId,
  webOrigin,
}: {
  accountId: string;
  webOrigin: string | null;
}) {
  return (
    <section className={studio.workspace} aria-labelledby="admin-heading">
      <header className={studio.pageHead}>
        <div className={studio.pageTitle}>
          <p className={eyebrow}>Administrator access</p>
          <h1 id="admin-heading">Staff access administration</h1>
          <p>
            Manage invitations, staff permissions and article attribution. The server verifies every
            change against current permissions and versions.
          </p>
        </div>
      </header>
      <MembersPanel accountId={accountId} />
      <InvitationsPanel webOrigin={webOrigin} />
      <ReassignmentPanel />
      <AuditPanel />
    </section>
  );
}
