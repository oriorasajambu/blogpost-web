'use client';

import { buttonPrimary, buttonSecondary, staffError, studio } from '@/components/ui/styles';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { staffRequest, StaffApiError } from '@/features/staff/staff-api';
import {
  ConfirmAction,
  ListHead,
  StaffCursorPagination,
  StaffError,
  StaffTime,
} from '@/features/staff/staff-ui';
import { STAFF_PAGE_SIZE, useCursorPager } from '@/features/staff/use-cursor-pager';
import type { CursorPagination } from '@/features/editor/editor-contract';
import {
  adminList,
  validateInvitation,
  validateInvitationIssue,
  type Invitation,
  type InvitationIssueResult,
} from '@/features/members/admin-contract';
import { AdminCommandRecovery, useAdminCommand } from '@/features/members/use-admin-command';

type Proposal =
  | { kind: 'create'; email: string; role: Invitation['role'] }
  | { kind: 'reissue' | 'revoke'; invitation: Invitation };
const INVITATION_FILTERS = ['status'] as const;

export function InvitationsPanel({ webOrigin }: { webOrigin: string | null }) {
  const pager = useCursorPager('invitation', INVITATION_FILTERS);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [page, setPage] = useState<CursorPagination | null>(null);
  const [status, setStatus] = useState(pager.filters.status);
  const listHeading = useRef<HTMLHeadingElement>(null);
  const focusAfterLoad = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Invitation['role']>('AUTHOR');
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [issued, setIssued] = useState<InvitationIssueResult | null>(null);
  const [notice, setNotice] = useState('');
  const command = useAdminCommand<Invitation | InvitationIssueResult>();
  const loadEpoch = useRef(0);
  const confirmationTrigger = useRef<HTMLButtonElement>(null);
  const createInvitationTrigger = useRef<HTMLButtonElement>(null);
  const blocked = command.busy || !!command.pending;
  const pendingInvitationExists =
    command.error instanceof StaffApiError && command.error.code === 'WORKFLOW_CONFLICT';
  const issueValidator = (value: unknown) =>
    validateInvitationIssue(
      value,
      webOrigin,
      proposal
        ? proposal.kind === 'create'
          ? { email: proposal.email, role: proposal.role }
          : {
              email: proposal.invitation.email,
              role: proposal.invitation.role,
              previousId: proposal.invitation.id,
            }
        : undefined,
    );
  const revokeValidator = (value: unknown) =>
    validateInvitation(
      value,
      proposal && proposal.kind !== 'create' ? proposal.invitation.id : undefined,
    );
  async function load() {
    const epoch = ++loadEpoch.current;
    // The URL is the source of truth, also for loads started by stale callbacks.
    const { cursor, filters } = pager.read();
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ pageSize: String(STAFF_PAGE_SIZE) });
      if (filters.status) query.set('status', filters.status);
      if (cursor) query.set('cursor', cursor);
      const result = await staffRequest(
        `/admin/invitations?${query}`,
        adminList(validateInvitation),
      );
      if (epoch !== loadEpoch.current) return;
      if (result.pagination?.kind !== 'CURSOR')
        throw new Error('Invitation pagination is unavailable.');
      setInvitations(result.data);
      // Keep the receipt's status current while preserving its one-time private link.
      setIssued((receipt) => {
        const latest = receipt && result.data.find((row) => row.id === receipt.invitation.id);
        return receipt && latest ? { ...receipt, invitation: latest } : receipt;
      });
      setPage(result.pagination);
      if (focusAfterLoad.current) listHeading.current?.focus();
    } catch (failure) {
      if (epoch !== loadEpoch.current) return;
      if (failure instanceof StaffApiError && failure.code === 'INVALID_CURSOR' && cursor) {
        setNotice('That page link expired. Showing the newest invitations.');
        pager.recover();
        return;
      }
      setError(failure);
      setInvitations([]);
      setPage(null);
      throw failure;
    } finally {
      if (epoch === loadEpoch.current) {
        setLoading(false);
        focusAfterLoad.current = false;
      }
    }
  }
  const loadLocation = useEffectEvent(() => {
    // Back/Forward and shared links decide the applied filter; show it in the select.
    setStatus(pager.filters.status);
    void load().catch(() => {});
  });
  const invalidateLoads = useEffectEvent(() => {
    loadEpoch.current++;
  });
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) loadLocation();
    });
    return () => {
      cancelled = true;
      invalidateLoads();
    };
  }, [pager.locationKey]);
  function turn(move: () => void) {
    setNotice('');
    focusAfterLoad.current = true;
    move();
  }
  /** After a write, show the newest page so the changed invitation is visible. */
  async function reloadNewest() {
    if (!pager.applyFilters(pager.filters)) await load().catch(() => {});
  }
  async function completed(result: Invitation | InvitationIssueResult | null) {
    if (!result) return;
    setProposal(null);
    if ('invitation' in result) {
      setIssued(result);
      setNotice(
        result.linkAvailable
          ? 'Invitation issued. Copy the link before leaving this page.'
          : 'The invitation completed, but its secret link is unavailable on replay. Explicitly reissue a replacement if needed.',
      );
    } else {
      setIssued(null);
      setNotice('The invitation was revoked.');
    }
    await reloadNewest();
  }
  function execute() {
    if (!proposal) return;
    setIssued(null);
    setNotice('');
    if (proposal.kind === 'create') {
      void command
        .run(
          {
            path: '/admin/invitations',
            method: 'POST',
            content: { email: proposal.email, role: proposal.role },
          },
          issueValidator,
        )
        .then(completed);
    } else {
      const action = proposal.kind;
      void command
        .run(
          {
            path: `/admin/invitations/${proposal.invitation.id}/${action}`,
            method: 'POST',
            version: proposal.invitation.version,
            content: {},
          },
          action === 'revoke' ? revokeValidator : issueValidator,
        )
        .then(completed);
    }
  }
  function retry() {
    const validator = command.pending?.path.endsWith('/revoke') ? revokeValidator : issueValidator;
    void command.retry(validator).then(completed);
  }
  async function refreshProposal() {
    if (proposal && proposal.kind !== 'create') {
      const result = await staffRequest(`/admin/invitations/${proposal.invitation.id}`, (value) =>
        validateInvitation(value, proposal.invitation.id),
      );
      setProposal({ ...proposal, invitation: result.data });
    }
    await load();
  }
  async function copyInvitationLink() {
    if (!issued?.inviteUrl) return;
    try {
      // Clipboard can be absent outside a secure context, or reject permission.
      await navigator.clipboard.writeText(issued.inviteUrl);
      setNotice('Invitation link copied.');
    } catch {
      setNotice(
        'Clipboard access is unavailable. Select the invitation link and copy it manually.',
      );
    }
  }
  return (
    <section className={studio.section} aria-labelledby="invitations-heading">
      <h2 id="invitations-heading" ref={listHeading} tabIndex={-1}>
        Invitations
      </h2>
      <p>
        Only the invited, verified Google account can accept a single-use invitation. When
        invitation email is set up, the link is emailed to the invited address; you can always copy
        and share it yourself too.
      </p>
      {!webOrigin && (
        <p role="status">
          Invitation-link creation is unavailable until the website origin is configured.
        </p>
      )}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex min-w-0 flex-col gap-4 xl:col-start-2 xl:row-start-1 [&>form]:rounded-xl [&>form]:bg-surface [&>form]:p-5 [&>form]:shadow-[0_0_0_1px_var(--color-hairline)] [&_fieldset]:border-0 [&_fieldset]:p-0 [&_legend]:mb-2 [&_legend]:p-0 [&_legend]:text-lg">
          <form
            className={studio.form}
            onSubmit={(event) => {
              event.preventDefault();
              const submitter = (event.nativeEvent as SubmitEvent).submitter;
              confirmationTrigger.current =
                submitter instanceof HTMLButtonElement
                  ? submitter
                  : createInvitationTrigger.current;
              setProposal({ kind: 'create', email, role });
            }}
          >
            <fieldset disabled={blocked || !!proposal || !webOrigin}>
              <legend>Invite staff</legend>
              <label htmlFor="invitation-email">Invited email</label>
              <input
                type="email"
                id="invitation-email"
                required
                maxLength={320}
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <label htmlFor="invitation-role">Invited role</label>
              <select
                id="invitation-role"
                value={role}
                onChange={(e) => setRole(e.target.value as Invitation['role'])}
              >
                <option value="AUTHOR">Author</option>
                <option value="EDITOR">Editor</option>
                <option value="ADMIN">Admin</option>
              </select>
              <button ref={createInvitationTrigger} type="submit" className={buttonPrimary}>
                Review invitation
              </button>
            </fieldset>
          </form>
          {proposal && (
            <ConfirmAction
              returnFocusRef={confirmationTrigger}
              title={
                proposal.kind === 'create'
                  ? 'Confirm staff invitation'
                  : proposal.kind === 'reissue'
                    ? 'Resend this invitation?'
                    : 'Revoke this invitation?'
              }
              confirmLabel={
                proposal.kind === 'create'
                  ? 'Issue invitation'
                  : proposal.kind === 'reissue'
                    ? 'Resend invitation'
                    : 'Revoke invitation'
              }
              danger={proposal.kind === 'revoke'}
              busy={command.busy}
              disabled={blocked}
              onCancel={command.pending ? undefined : () => setProposal(null)}
              onConfirm={execute}
            >
              {proposal.kind === 'create' ? (
                <>
                  <p>
                    Invite <strong>{proposal.email}</strong> with the{' '}
                    <strong>{proposal.role.toLowerCase()}</strong> role. Acceptance grants that
                    staff access.
                  </p>
                  <p className={studio.muted}>
                    If invitation email is set up, a single-use link is emailed to {proposal.email}.
                    The receipt also shows the link once so you can share it yourself.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    {proposal.invitation.email} · {proposal.invitation.role.toLowerCase()} · current
                    status {proposal.invitation.status.toLowerCase()} · version{' '}
                    {proposal.invitation.version}.
                  </p>
                  <p>
                    {proposal.kind === 'reissue'
                      ? `A new single-use link replaces the old one, which stops working immediately. If invitation email is set up, the new link is emailed to ${proposal.invitation.email}; the receipt also shows it once.`
                      : 'The current link will stop granting access. This does not disable an account that has already accepted.'}
                  </p>
                </>
              )}
            </ConfirmAction>
          )}
          {pendingInvitationExists && (
            <div className={staffError} role="alert">
              <p>
                A pending invitation already exists. Cancel this request, then resend or revoke the
                existing invitation in the list. It may have expired: expired invitations still need
                to be resent or revoked before inviting that address again.
              </p>
              <div className={studio.actions}>
                <button
                  type="button"
                  className={buttonSecondary}
                  onClick={() => {
                    setStatus('EXPIRED');
                    if (!pager.applyFilters({ status: 'EXPIRED' })) void load().catch(() => {});
                  }}
                >
                  Show expired invitations
                </button>
              </div>
              {command.error instanceof StaffApiError && command.error.traceId && (
                <p className={studio.muted}>
                  Support reference: <code>{command.error.traceId}</code>
                </p>
              )}
            </div>
          )}
          <AdminCommandRecovery
            command={pendingInvitationExists ? { ...command, error: null } : command}
            onRetry={retry}
            onCheck={refreshProposal}
            onReviewed={() => setProposal(null)}
          />
          {!blocked && !!command.error && proposal?.kind !== 'create' && (
            <button
              className={buttonSecondary}
              type="button"
              onClick={() => {
                void refreshProposal()
                  .then(() => {
                    command.clearError();
                    setNotice(
                      'Latest invitation loaded. Review its status and version before confirming again.',
                    );
                  })
                  .catch(setError);
              }}
            >
              Load latest invitation
            </button>
          )}
          {issued && (
            <section className={studio.card} aria-labelledby="issued-invitation-heading">
              <h3 id="issued-invitation-heading">Invitation receipt</h3>
              <p>
                {issued.invitation.email} · {issued.invitation.role.toLowerCase()} · expires{' '}
                <StaffTime value={issued.invitation.expiresAt} />
              </p>
              <DeliveryNote invitation={issued.invitation} />
              {issued.linkAvailable && issued.inviteUrl ? (
                <>
                  <label htmlFor="issued-invitation-link">Private invitation link</label>
                  <input
                    id="issued-invitation-link"
                    readOnly
                    value={issued.inviteUrl}
                    onFocus={(event) => event.currentTarget.select()}
                    autoComplete="off"
                  />
                  <div className={studio.actions}>
                    <button
                      type="button"
                      className={buttonSecondary}
                      onClick={() => void copyInvitationLink()}
                    >
                      Copy invitation link
                    </button>
                    <button
                      type="button"
                      className={buttonSecondary}
                      onClick={() => setIssued(null)}
                    >
                      Hide private link
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p>
                    The secret link cannot be recovered from this receipt. Resend the invitation to
                    obtain a new link.
                  </p>
                  {webOrigin && (
                    <button
                      type="button"
                      className={buttonSecondary}
                      disabled={blocked}
                      onClick={(event) => {
                        confirmationTrigger.current = event.currentTarget;
                        setProposal({ kind: 'reissue', invitation: issued.invitation });
                      }}
                    >
                      Review replacement invitation
                    </button>
                  )}
                </>
              )}
            </section>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-4 xl:col-start-1 xl:row-start-1">
          <p role="status">{notice}</p>
          <form
            className={studio.filters}
            onSubmit={(event) => {
              event.preventDefault();
              if (!pager.applyFilters({ status })) void load().catch(() => {});
            }}
          >
            <label>
              Invitation status{' '}
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">All statuses</option>
                <option value="PENDING">Pending</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="REVOKED">Revoked</option>
                <option value="EXPIRED">Expired</option>
              </select>
            </label>
            <button type="submit" className={buttonSecondary} disabled={loading}>
              Apply invitation filter
            </button>
          </form>
          <StaffError error={error} />
          {loading ? (
            <p role="status">Loading invitations…</p>
          ) : !error && !invitations.length ? (
            <p>No invitations match this filter.</p>
          ) : null}
          <div className={studio.table}>
            <ListHead
              columns={['Invitation', 'Role · status · version', '']}
              template="lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,14rem)]"
            />
            <ul className={`staff-list ${studio.rows}`}>
              {invitations.map((invitation) => (
                <li
                  key={invitation.id}
                  className={`${studio.row} lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,14rem)] lg:[&>div:first-child]:contents lg:[&_h3]:col-start-1 lg:[&_h3]:row-start-1 lg:[&>div:first-child>p:nth-of-type(1)]:col-start-2 lg:[&>div:first-child>p:nth-of-type(1)]:row-start-1 lg:[&>div:first-child>p:nth-of-type(n+2)]:col-start-1 lg:[&>div:last-child:not(:first-child)]:col-start-3 lg:[&>div:last-child:not(:first-child)]:row-span-3 lg:[&>div:last-child:not(:first-child)]:row-start-1`}
                >
                  <div>
                    <h3>{invitation.email}</h3>
                    <p className="flex flex-wrap items-center gap-2">
                      <span>{invitation.role.toLowerCase()}</span>
                      <span className="sr-only"> · </span>
                      <span
                        className={studio.statusChip}
                        data-tone={
                          invitation.status === 'PENDING'
                            ? 'warning'
                            : invitation.status === 'ACCEPTED'
                              ? 'success'
                              : undefined
                        }
                      >
                        {invitation.status.toLowerCase()}
                      </span>
                      <span className="sr-only"> · </span>
                      <span>version {invitation.version}</span>
                      <DeliveryChip delivery={invitation.delivery} />
                    </p>
                    <p>
                      Issued by {invitation.issuedBy.displayName} on{' '}
                      <StaffTime value={invitation.createdAt} />. Expires{' '}
                      <StaffTime value={invitation.expiresAt} />.
                    </p>
                    {invitation.acceptedAt && (
                      <p>
                        Accepted <StaffTime value={invitation.acceptedAt} />.
                      </p>
                    )}
                    {invitation.revokedAt && (
                      <p>
                        Revoked <StaffTime value={invitation.revokedAt} />.
                      </p>
                    )}
                  </div>
                  {invitation.status !== 'ACCEPTED' && (
                    <div className={studio.actions}>
                      {webOrigin && (
                        <button
                          type="button"
                          className={buttonSecondary}
                          disabled={blocked || !!proposal}
                          onClick={(event) => {
                            confirmationTrigger.current = event.currentTarget;
                            setProposal({ kind: 'reissue', invitation });
                          }}
                        >
                          Resend invitation to {invitation.email}
                        </button>
                      )}
                      {invitation.status !== 'REVOKED' && (
                        <button
                          type="button"
                          className={buttonSecondary}
                          disabled={blocked || !!proposal}
                          onClick={(event) => {
                            confirmationTrigger.current = event.currentTarget;
                            setProposal({ kind: 'revoke', invitation });
                          }}
                        >
                          Revoke for {invitation.email}
                        </button>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
          {invitations.some((invitation) => invitation.delivery.status === 'QUEUED') && (
            <p className={studio.muted}>
              Some invitation emails are still queued. Refresh invitations to see their latest
              delivery status.
            </p>
          )}
          <StaffCursorPagination
            kind="invitations"
            count={invitations.length}
            pageSize={STAFF_PAGE_SIZE}
            pageNumber={pager.position.pageNumber}
            canGoBack={pager.position.previous !== null}
            canReturnToNewest={pager.position.canReturnToNewest}
            hasMore={!!(page?.hasMore && page.nextCursor)}
            // Paging mid-command would race the command's own reload.
            disabled={loading || blocked}
            onPrevious={() => turn(pager.previous)}
            onNewest={() => turn(pager.newest)}
            onNext={() => turn(() => pager.next(page!.nextCursor!))}
          />
          <div className={studio.actions}>
            <button
              type="button"
              className={buttonSecondary}
              disabled={loading}
              onClick={() => {
                void load().catch(() => {});
              }}
            >
              Refresh invitations
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
const DELIVERY_LABELS: Record<Invitation['delivery']['status'], string> = {
  NOT_REQUESTED: '',
  QUEUED: 'email queued',
  SENT: 'email sent',
  FAILED: 'email failed',
  CANCELLED: 'email cancelled',
};
/** The text names the state; the tone only reinforces it. */
function DeliveryChip({ delivery }: { delivery: Invitation['delivery'] }) {
  if (delivery.status === 'NOT_REQUESTED') return null;
  return (
    <>
      <span className="sr-only"> · </span>
      <span
        className={studio.statusChip}
        data-tone={
          delivery.status === 'SENT'
            ? 'success'
            : delivery.status === 'FAILED'
              ? 'danger'
              : delivery.status === 'QUEUED'
                ? 'info'
                : undefined
        }
      >
        <span aria-hidden="true">✉</span> {DELIVERY_LABELS[delivery.status]}
      </span>
    </>
  );
}
function DeliveryNote({ invitation }: { invitation: Invitation }) {
  const { status, sentAt } = invitation.delivery;
  if (status === 'NOT_REQUESTED')
    return (
      <p className={studio.muted}>
        Invitation email is not set up, so share this link with {invitation.email} yourself.
      </p>
    );
  if (status === 'SENT')
    return (
      <p>
        Emailed to {invitation.email} <StaffTime value={sentAt} />. You can also share the link
        below.
      </p>
    );
  if (status === 'QUEUED')
    return (
      <p>
        The email to {invitation.email} is queued and will be retried automatically. You can share
        the link below in the meantime.
      </p>
    );
  if (status === 'FAILED')
    return (
      <p role="alert">
        The email to {invitation.email} could not be delivered. Share the link below yourself, or
        resend the invitation later.
      </p>
    );
  return <p className={studio.muted}>The email for this invitation was cancelled.</p>;
}
