'use client';

import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { staffRequest, StaffApiError } from '@/features/staff/staff-api';
import { StaffError, StaffTime, ConfirmAction } from '@/features/staff/staff-ui';
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
export function InvitationsPanel({ webOrigin }: { webOrigin: string | null }) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [page, setPage] = useState<CursorPagination | null>(null);
  const [status, setStatus] = useState('');
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
  async function load(cursor?: string) {
    const epoch = ++loadEpoch.current;
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ pageSize: '20' });
      if (status) query.set('status', status);
      if (cursor) query.set('cursor', cursor);
      const result = await staffRequest(
        `/admin/invitations?${query}`,
        adminList(validateInvitation),
      );
      if (epoch !== loadEpoch.current) return;
      if (result.pagination?.kind !== 'CURSOR')
        throw new Error('Invitation pagination is unavailable.');
      setInvitations(result.data);
      setPage(result.pagination);
    } catch (failure) {
      if (epoch !== loadEpoch.current) return;
      setError(failure);
      setInvitations([]);
      setPage(null);
      throw failure;
    } finally {
      if (epoch === loadEpoch.current) setLoading(false);
    }
  }
  const initiallyLoad = useEffectEvent(() => load().catch(() => {}));
  const invalidateLoads = useEffectEvent(() => {
    loadEpoch.current++;
  });
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void initiallyLoad();
    });
    return () => {
      cancelled = true;
      invalidateLoads();
    };
  }, []);
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
    await load().catch(() => {});
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
    <section className="staff-card" aria-labelledby="invitations-heading">
      <h2 id="invitations-heading">Invitations</h2>
      <p>
        Only the invited, verified Google account can accept a single-use invitation. Copy and share
        a link yourself; issuing an invitation does not send an email.
      </p>
      {!webOrigin && (
        <p role="status">
          Invitation-link creation is unavailable until the website origin is configured.
        </p>
      )}
      <form
        className="staff-form"
        onSubmit={(event) => {
          event.preventDefault();
          const submitter = (event.nativeEvent as SubmitEvent).submitter;
          confirmationTrigger.current =
            submitter instanceof HTMLButtonElement ? submitter : createInvitationTrigger.current;
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
          <button ref={createInvitationTrigger} type="submit" className="button-primary">
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
                ? 'Reissue this invitation?'
                : 'Revoke this invitation?'
          }
          confirmLabel={
            proposal.kind === 'create'
              ? 'Issue invitation'
              : proposal.kind === 'reissue'
                ? 'Issue replacement link'
                : 'Revoke invitation'
          }
          busy={command.busy}
          disabled={blocked}
          onCancel={command.pending ? undefined : () => setProposal(null)}
          onConfirm={execute}
        >
          {proposal.kind === 'create' ? (
            <p>
              Invite <strong>{proposal.email}</strong> with the{' '}
              <strong>{proposal.role.toLowerCase()}</strong> role. Acceptance grants that staff
              access.
            </p>
          ) : (
            <>
              <p>
                {proposal.invitation.email} · {proposal.invitation.role.toLowerCase()} · current
                status {proposal.invitation.status.toLowerCase()} · version{' '}
                {proposal.invitation.version}.
              </p>
              <p>
                {proposal.kind === 'reissue'
                  ? 'The prior invitation is revoked and a replacement is issued. Its link is shown once; anyone holding the prior link will need the replacement.'
                  : 'The current link will stop granting access. This does not disable an account that has already accepted.'}
              </p>
            </>
          )}
        </ConfirmAction>
      )}
      {pendingInvitationExists && (
        <div className="staff-error" role="alert">
          <p>
            A pending invitation already exists. Cancel this request, then review, reissue or revoke
            the existing invitation in the list.
          </p>
          {command.error instanceof StaffApiError && command.error.traceId && (
            <p className="staff-muted">
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
          className="button-secondary"
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
        <section className="staff-card" aria-labelledby="issued-invitation-heading">
          <h3 id="issued-invitation-heading">Invitation receipt</h3>
          <p>
            {issued.invitation.email} · {issued.invitation.role.toLowerCase()} · expires{' '}
            <StaffTime value={issued.invitation.expiresAt} />
          </p>
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
              <div className="staff-actions">
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => void copyInvitationLink()}
                >
                  Copy invitation link
                </button>
                <button type="button" className="button-secondary" onClick={() => setIssued(null)}>
                  Hide private link
                </button>
              </div>
            </>
          ) : (
            <>
              <p>
                The secret link cannot be recovered from this receipt. Issue a replacement to obtain
                a new link.
              </p>
              {webOrigin && (
                <button
                  type="button"
                  className="button-secondary"
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
      <p role="status">{notice}</p>
      <form
        className="staff-actions"
        onSubmit={(event) => {
          event.preventDefault();
          void load().catch(() => {});
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
        <button type="submit" className="button-secondary" disabled={loading}>
          Apply invitation filter
        </button>
      </form>
      <StaffError error={error} />
      {loading ? (
        <p role="status">Loading invitations…</p>
      ) : !error && !invitations.length ? (
        <p>No invitations match this filter.</p>
      ) : null}
      <ul className="staff-list">
        {invitations.map((invitation) => (
          <li key={invitation.id}>
            <div>
              <h3>{invitation.email}</h3>
              <p>
                {invitation.role.toLowerCase()} · {invitation.status.toLowerCase()} · version{' '}
                {invitation.version}
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
              <div className="staff-actions">
                {webOrigin && (
                  <button
                    type="button"
                    className="button-secondary"
                    disabled={blocked || !!proposal}
                    onClick={(event) => {
                      confirmationTrigger.current = event.currentTarget;
                      setProposal({ kind: 'reissue', invitation });
                    }}
                  >
                    Reissue for {invitation.email}
                  </button>
                )}
                {invitation.status !== 'REVOKED' && (
                  <button
                    type="button"
                    className="button-secondary"
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
      <div className="staff-actions">
        <button
          type="button"
          className="button-secondary"
          disabled={loading}
          onClick={() => {
            void load().catch(() => {});
          }}
        >
          Refresh invitations
        </button>
        {page?.hasMore && page.nextCursor && (
          <button
            type="button"
            className="button-secondary"
            disabled={loading}
            onClick={() => {
              void load(page.nextCursor!).catch(() => {});
            }}
          >
            Next invitations
          </button>
        )}
      </div>
    </section>
  );
}
