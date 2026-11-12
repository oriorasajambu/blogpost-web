'use client';

import { buttonPrimary, buttonSecondary, studio } from '@/components/ui/styles';
import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { staffRequest } from '@/features/staff/staff-api';
import { ConfirmAction, ListHead, StaffError, StaffTime } from '@/features/staff/staff-ui';
import type { CursorPagination } from '@/features/editor/editor-contract';
import { adminList, validateAdminMember, type AdminMember } from './admin-contract';
import { AdminCommandRecovery, useAdminCommand } from './use-admin-command';

export function MembersPanel({ accountId }: { accountId: string }) {
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [page, setPage] = useState<CursorPagination | null>(null);
  const [role, setRole] = useState('');
  const [active, setActive] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AdminMember | null>(null);
  const [selectionBusy, setSelectionBusy] = useState(false);
  const [editorLocked, setEditorLocked] = useState(false);
  const selectionLock = useRef(false);
  const selectionEpoch = useRef(0);
  const lockEditor = useCallback((locked: boolean) => {
    selectionLock.current = locked;
    if (locked) {
      // A selection requested before confirmation must not replace this editor.
      selectionEpoch.current++;
      setSelectionBusy(false);
    }
    setEditorLocked(locked);
  }, []);
  const loadEpoch = useRef(0);
  async function load(cursor?: string) {
    const epoch = ++loadEpoch.current;
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ pageSize: '20' });
      if (role) query.set('role', role);
      if (active) query.set('active', active);
      if (cursor) query.set('cursor', cursor);
      const result = await staffRequest(`/admin/members?${query}`, adminList(validateAdminMember));
      if (epoch !== loadEpoch.current) return;
      if (result.pagination?.kind !== 'CURSOR')
        throw new Error('Member pagination is unavailable.');
      setMembers(result.data);
      setPage(result.pagination);
    } catch (failure) {
      if (epoch !== loadEpoch.current) return;
      setError(failure);
      setMembers([]);
      setPage(null);
      throw failure;
    } finally {
      if (epoch === loadEpoch.current) setLoading(false);
    }
  }
  const initiallyLoad = useEffectEvent(() => load().catch(() => {}));
  const invalidateLoads = useEffectEvent(() => {
    loadEpoch.current++;
    selectionEpoch.current++;
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
  async function select(id: string) {
    if (selectionLock.current) return;
    const epoch = ++selectionEpoch.current;
    setSelectionBusy(true);
    setError(null);
    try {
      const result = await staffRequest(`/admin/members/${id}`, (value) =>
        validateAdminMember(value, id),
      );
      if (epoch !== selectionEpoch.current || selectionLock.current) return;
      setSelected(result.data);
    } catch (failure) {
      if (epoch === selectionEpoch.current) setError(failure);
    } finally {
      if (epoch === selectionEpoch.current) setSelectionBusy(false);
    }
  }
  return (
    <section aria-labelledby="members-heading" className={studio.section}>
      <h2 id="members-heading">Staff members</h2>
      <form
        className={studio.filters}
        onSubmit={(event) => {
          event.preventDefault();
          if (selectionLock.current) return;
          void load().catch(() => {});
        }}
      >
        <label>
          Role{' '}
          <select disabled={editorLocked} value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">All roles</option>
            <option value="AUTHOR">Author</option>
            <option value="EDITOR">Editor</option>
            <option value="ADMIN">Admin</option>
          </select>
        </label>
        <label>
          Access{' '}
          <select
            disabled={editorLocked}
            value={active}
            onChange={(e) => setActive(e.target.value)}
          >
            <option value="">All accounts</option>
            <option value="true">Active</option>
            <option value="false">Disabled</option>
          </select>
        </label>
        <button type="submit" className={buttonSecondary} disabled={loading || editorLocked}>
          Apply member filters
        </button>
      </form>
      <StaffError error={error} />
      {loading ? (
        <p role="status">Loading staff members…</p>
      ) : members.length === 0 && !error ? (
        <p>No staff members match these filters.</p>
      ) : null}
      <div className={studio.table}>
        <ListHead
          columns={['Member', 'Role · access', '']}
          template="lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,14rem)]"
        />
        <ul className={`staff-list ${studio.rows}`}>
          {members.map((member) => (
            <li
              key={member.id}
              className={`${studio.row} lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,14rem)] lg:[&>div]:contents lg:[&_strong]:col-start-1 lg:[&_strong]:row-start-1 lg:[&>div>span]:col-start-2 lg:[&>div>span]:row-start-1 lg:[&_div>p]:col-start-1 lg:[&_div>p]:row-start-2 lg:[&>button]:col-start-3 lg:[&>button]:row-span-2 lg:[&>button]:row-start-1 [&_strong]:font-medium`}
            >
              <div>
                <strong>{member.displayName}</strong>{' '}
                <span className="flex flex-wrap items-center gap-2">
                  <span
                    className={studio.statusChip}
                    data-tone={member.role === 'ADMIN' ? 'accent' : undefined}
                  >
                    {member.role.toLowerCase()}
                  </span>
                  <span className="sr-only"> · </span>
                  <span
                    className={studio.statusChip}
                    data-tone={member.active ? 'success' : 'danger'}
                  >
                    {member.active ? 'Active' : 'Disabled'}
                  </span>
                </span>
                <p>{member.email}</p>
              </div>
              <button
                type="button"
                className={buttonSecondary}
                disabled={selectionBusy || editorLocked}
                onClick={() => {
                  void select(member.id);
                }}
              >
                Manage {member.displayName}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className={studio.actions}>
        <button
          type="button"
          className={buttonSecondary}
          disabled={loading || editorLocked}
          onClick={() => {
            if (selectionLock.current) return;
            void load().catch(() => {});
          }}
        >
          Refresh members
        </button>
        {page?.hasMore && page.nextCursor && (
          <button
            type="button"
            className={buttonSecondary}
            disabled={loading || editorLocked}
            onClick={() => {
              if (selectionLock.current) return;
              void load(page.nextCursor!).catch(() => {});
            }}
          >
            Next members
          </button>
        )}
      </div>
      {selected && (
        <MemberEditor
          key={selected.id}
          initial={selected}
          accountId={accountId}
          onLockChange={lockEditor}
          onSaved={() => {
            void load().catch(() => {});
          }}
        />
      )}
    </section>
  );
}

function MemberEditor({
  initial,
  accountId,
  onSaved,
  onLockChange,
}: {
  initial: AdminMember;
  accountId: string;
  onSaved: () => void;
  onLockChange: (locked: boolean) => void;
}) {
  const router = useRouter();
  const [member, setMember] = useState(initial);
  const [role, setRole] = useState(initial.role);
  const [active, setActive] = useState(initial.active);
  const [confirming, setConfirming] = useState(false);
  const confirmationTrigger = useRef<HTMLButtonElement>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const command = useAdminCommand<AdminMember>();
  const readingBlocked = command.busy || !!command.pending || loading;
  const blocked = readingBlocked || needsRefresh;
  useEffect(() => {
    onLockChange(confirming || command.busy || !!command.pending || loading || needsRefresh);
    return () => onLockChange(false);
  }, [confirming, command.busy, command.pending, loading, needsRefresh, onLockChange]);
  async function latest() {
    onLockChange(true);
    setLoading(true);
    try {
      const response = await staffRequest(`/admin/members/${member.id}`, (value) =>
        validateAdminMember(value, member.id),
      );
      setMember(response.data);
      setNeedsRefresh(false);
      return response.data;
    } catch (failure) {
      setNeedsRefresh(true);
      throw failure;
    } finally {
      setLoading(false);
    }
  }
  async function saved(result: AdminMember | null) {
    if (!result) return;
    setConfirming(false);
    setNotice('Staff access change completed.');
    if (result.id === accountId && (result.role !== initial.role || !result.active)) {
      window.dispatchEvent(new Event('blogpost:staff-access-lost'));
      router.replace('/studio/posts');
      router.refresh();
      return;
    }
    try {
      await latest();
      onSaved();
    } catch (failure) {
      setError(failure);
    }
  }
  return (
    <section className={studio.card} aria-labelledby={`manage-${member.id}`}>
      <h3 id={`manage-${member.id}`}>Manage {member.displayName}</h3>
      <p>
        {member.email} · public handle {member.handle}
      </p>
      <dl className={studio.definitions}>
        <dt>Current role</dt>
        <dd>{member.role.toLowerCase()}</dd>
        <dt>Current access</dt>
        <dd>{member.active ? 'Active' : 'Disabled'}</dd>
        <dt>Created</dt>
        <dd>
          <StaffTime value={member.createdAt} />
        </dd>
        <dt>Last changed</dt>
        <dd>
          <StaffTime value={member.updatedAt} />
        </dd>
        <dt>Version</dt>
        <dd>{member.version}</dd>
      </dl>
      <form
        className={studio.form}
        onSubmit={(event) => {
          event.preventDefault();
          onLockChange(true);
          setConfirming(true);
          setNotice('');
        }}
      >
        <fieldset disabled={blocked || confirming}>
          <legend>Proposed staff access</legend>
          <label>
            Role{' '}
            <select value={role} onChange={(e) => setRole(e.target.value as AdminMember['role'])}>
              <option value="AUTHOR">Author</option>
              <option value="EDITOR">Editor</option>
              <option value="ADMIN">Admin</option>
            </select>
          </label>
          <label>
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />{' '}
            Staff access active
          </label>
          <button
            ref={confirmationTrigger}
            type="submit"
            className={buttonPrimary}
            disabled={role === member.role && active === member.active}
          >
            Review access change
          </button>
        </fieldset>
      </form>
      {confirming && (
        <ConfirmAction
          returnFocusRef={confirmationTrigger}
          title="Confirm staff access change"
          confirmLabel="Change staff access"
          busy={command.busy}
          disabled={blocked}
          onCancel={command.pending ? undefined : () => setConfirming(false)}
          onConfirm={() => {
            void command
              .run(
                {
                  path: `/admin/members/${member.id}`,
                  method: 'PATCH',
                  version: member.version,
                  content: { role, active },
                },
                (value) => validateAdminMember(value, member.id),
              )
              .then(saved);
          }}
        >
          <p>
            {member.displayName} will have the <strong>{role.toLowerCase()}</strong> role and{' '}
            <strong>{active ? 'active' : 'disabled'}</strong> access. Disabling blocks staff
            requests and sign-in; role changes affect available actions. Attribution and existing
            articles are retained.
          </p>
          {member.id === accountId && (
            <p>This changes your own access and will reload your workspace.</p>
          )}
          <p>
            At least one active administrator must remain. The server checks this when the change is
            committed.
          </p>
        </ConfirmAction>
      )}
      <AdminCommandRecovery
        command={command}
        onRetry={() => {
          void command.retry((value) => validateAdminMember(value, member.id)).then(saved);
        }}
        onCheck={latest}
        onReviewed={() => setConfirming(false)}
      />
      <StaffError error={error} />
      {needsRefresh && (
        <p>
          The change may have completed. Load the latest account before changing staff access or
          selecting another member.
        </p>
      )}
      <p role="status">{notice}</p>
      <button
        type="button"
        className={buttonSecondary}
        disabled={readingBlocked}
        onClick={() => {
          setLoading(true);
          setError(null);
          void latest()
            .then(() => {
              setConfirming(false);
              command.clearError();
              setNotice(
                'Latest account loaded. Your proposed role/access was kept. Review the current account before confirming again.',
              );
            })
            .catch(setError)
            .finally(() => setLoading(false));
        }}
      >
        Load latest account
      </button>
    </section>
  );
}
