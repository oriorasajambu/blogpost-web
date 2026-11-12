'use client';

import { buttonPrimary, buttonSecondary, studio } from '@/components/ui/styles';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { staffRequest } from '@/features/staff/staff-api';
import { StaffError, StaffTime, ConfirmAction } from '@/features/staff/staff-ui';
import {
  validateWorkspaceSummary,
  type WorkspacePost,
  type WorkspacePostSummary,
  type CursorPagination,
} from '@/features/editor/editor-contract';
import {
  adminList,
  validateAdminMember,
  validateAdminPost,
  type AdminMember,
} from './admin-contract';
import { AdminCommandRecovery, useAdminCommand } from './use-admin-command';

export function ReassignmentPanel() {
  const [posts, setPosts] = useState<WorkspacePostSummary[]>([]);
  const [postPage, setPostPage] = useState<CursorPagination | null>(null);
  const [targets, setTargets] = useState<AdminMember[]>([]);
  const [targetPage, setTargetPage] = useState<CursorPagination | null>(null);
  const [post, setPost] = useState<WorkspacePost | null>(null);
  const [target, setTarget] = useState<AdminMember | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [notice, setNotice] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const confirmationTrigger = useRef<HTMLButtonElement>(null);
  const command = useAdminCommand<WorkspacePost>();
  const postEpoch = useRef(0);
  const targetEpoch = useRef(0);
  const guardEpoch = useRef(0);
  const selectionEpoch = useRef(0);
  const selectedPostId = useRef<string | null>(null);
  const reconciliationLock = useRef(false);
  const refreshRequired = useRef(false);
  const blocked = busy || reconciling || needsRefresh || command.busy || !!command.pending;
  const canRefresh = !busy && !reconciling && !command.busy && !command.pending;
  function requireRefresh(value: boolean) {
    refreshRequired.current = value;
    setNeedsRefresh(value);
  }
  async function loadPosts(cursor?: string) {
    const epoch = ++postEpoch.current;
    const query = new URLSearchParams({ scope: 'ALL', trashed: 'false', pageSize: '20' });
    if (cursor) query.set('cursor', cursor);
    const result = await staffRequest(`/posts?${query}`, adminList(validateWorkspaceSummary));
    if (epoch !== postEpoch.current) return;
    if (result.pagination?.kind !== 'CURSOR') throw new Error('Post pagination is unavailable.');
    setPosts(result.data);
    setPostPage(result.pagination);
  }
  async function loadTargets(cursor?: string) {
    const epoch = ++targetEpoch.current;
    const query = new URLSearchParams({ active: 'true', pageSize: '20' });
    if (cursor) query.set('cursor', cursor);
    const result = await staffRequest(`/admin/members?${query}`, adminList(validateAdminMember));
    if (epoch !== targetEpoch.current) return;
    if (result.pagination?.kind !== 'CURSOR') throw new Error('Member pagination is unavailable.');
    setTargets(result.data);
    setTargetPage(result.pagination);
  }
  async function guarded(operation: () => Promise<unknown>) {
    const epoch = ++guardEpoch.current;
    setBusy(true);
    setError(null);
    try {
      await operation();
    } catch (failure) {
      if (epoch === guardEpoch.current) {
        setError(failure);
        setPosts([]);
        setTargets([]);
      }
    } finally {
      if (epoch === guardEpoch.current) setBusy(false);
    }
  }
  const initiallyLoad = useEffectEvent(() =>
    guarded(async () => {
      await Promise.all([loadPosts(), loadTargets()]);
    }),
  );
  const invalidateLoads = useEffectEvent(() => {
    postEpoch.current++;
    targetEpoch.current++;
    guardEpoch.current++;
    selectionEpoch.current++;
    selectedPostId.current = null;
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
  async function latest(id = selectedPostId.current, epoch = selectionEpoch.current) {
    if (!id) throw new Error('Select an article first.');
    const response = await staffRequest(`/posts/${id}`, (value) => validateAdminPost(value, id));
    if (epoch !== selectionEpoch.current || selectedPostId.current !== id)
      throw new Error(
        'The article selection changed. Load its current ownership before continuing.',
      );
    setPost(response.data);
    return response.data;
  }
  async function reassign(retry = false) {
    if (!post || !target || reconciliationLock.current || (refreshRequired.current && !retry))
      return;
    const id = post.id;
    const epoch = selectionEpoch.current;
    reconciliationLock.current = true;
    setReconciling(true);
    setError(null);
    setNotice('');
    let committed = false;
    try {
      const result = retry
        ? await command.retry((value) => validateAdminPost(value, id))
        : await command.run(
            {
              path: `/admin/posts/${id}/author`,
              method: 'PATCH',
              version: post.version,
              content: { authorId: target.id },
            },
            (value) => validateAdminPost(value, id),
          );
      if (!result) {
        // Keep the selection fixed even before the command hook's state renders.
        // Unknown outcomes retain their original retry; known failures need review.
        requireRefresh(true);
        return;
      }
      committed = true;
      setConfirming(false);
      setNotice('Author reassignment saved. Checking current article ownership…');
      await latest(id, epoch);
      await loadPosts();
      if (epoch !== selectionEpoch.current || selectedPostId.current !== id) return;
      requireRefresh(false);
      setNotice(
        'Author reassignment completed. A new working draft revision was created; review it before publication.',
      );
    } catch (failure) {
      if (epoch === selectionEpoch.current && selectedPostId.current === id) {
        requireRefresh(true);
        setError(failure);
        if (committed)
          setNotice(
            'Author reassignment completed, but current ownership could not be loaded. Load latest article ownership before another change.',
          );
      }
    } finally {
      reconciliationLock.current = false;
      if (epoch === selectionEpoch.current) setReconciling(false);
    }
  }
  return (
    <section className={studio.section} aria-labelledby="reassignment-heading">
      <h2 id="reassignment-heading">Author reassignment</h2>
      <p>
        Transfer working ownership to an active staff member. This is an audited administrator
        action. The previous owner may lose access to the draft.
      </p>
      <div className={studio.grid}>
        <div>
          <h3>Choose an article</h3>
          <ul className={studio.list}>
            {posts.map((item) => (
              <li key={item.id}>
                <div>
                  <strong>{item.slug ?? 'Untitled address'}</strong>
                  <p>
                    {item.author.displayName} · {item.publicationState.toLowerCase()} ·{' '}
                    {item.workflowState.toLowerCase().replaceAll('_', ' ')}
                  </p>
                  <p className={studio.muted}>Article ID: {item.id}</p>
                </div>
                <button
                  className={buttonSecondary}
                  type="button"
                  disabled={blocked || confirming}
                  onClick={() => {
                    if (
                      blocked ||
                      confirming ||
                      reconciliationLock.current ||
                      refreshRequired.current
                    )
                      return;
                    const epoch = ++selectionEpoch.current;
                    selectedPostId.current = item.id;
                    setPost(null);
                    void guarded(async () => {
                      const result = await staffRequest(`/posts/${item.id}`, (value) =>
                        validateAdminPost(value, item.id),
                      );
                      if (epoch !== selectionEpoch.current || selectedPostId.current !== item.id)
                        return;
                      setPost(result.data);
                      setNotice('');
                    });
                  }}
                >
                  Choose article {item.slug ?? item.id}
                </button>
              </li>
            ))}
          </ul>
          <div className={studio.actions}>
            <button
              type="button"
              className={buttonSecondary}
              disabled={blocked}
              onClick={() => {
                void guarded(() => loadPosts());
              }}
            >
              Refresh article choices
            </button>
            {postPage?.hasMore && postPage.nextCursor && (
              <button
                type="button"
                className={buttonSecondary}
                disabled={blocked}
                onClick={() => {
                  void guarded(() => loadPosts(postPage.nextCursor!));
                }}
              >
                Next article choices
              </button>
            )}
          </div>
        </div>
        <div>
          <h3>Choose a new author</h3>
          <ul className={studio.list}>
            {targets.map((member) => (
              <li key={member.id}>
                <div>
                  <strong>{member.displayName}</strong>
                  <p>
                    {member.email} · {member.role.toLowerCase()}
                  </p>
                </div>
                <button
                  type="button"
                  className={buttonSecondary}
                  disabled={blocked || confirming}
                  onClick={() => {
                    if (
                      blocked ||
                      confirming ||
                      reconciliationLock.current ||
                      refreshRequired.current
                    )
                      return;
                    setTarget(member);
                    setNotice('');
                  }}
                >
                  Choose author {member.displayName}
                </button>
              </li>
            ))}
          </ul>
          <div className={studio.actions}>
            <button
              type="button"
              className={buttonSecondary}
              disabled={blocked}
              onClick={() => {
                void guarded(() => loadTargets());
              }}
            >
              Refresh author choices
            </button>
            {targetPage?.hasMore && targetPage.nextCursor && (
              <button
                type="button"
                className={buttonSecondary}
                disabled={blocked}
                onClick={() => {
                  void guarded(() => loadTargets(targetPage.nextCursor!));
                }}
              >
                Next author choices
              </button>
            )}
          </div>
        </div>
      </div>
      <StaffError error={error} />
      {(busy || reconciling) && <p role="status">Loading current server information…</p>}
      {needsRefresh && !command.pending && (
        <p>Load the latest article ownership and review it before starting another reassignment.</p>
      )}
      {post && (
        <div className={studio.card}>
          <h3>
            Selected article: {post.workingRevision?.content.title || post.slug || 'Untitled draft'}
          </h3>
          <p>
            Last loaded author: {post.author.displayName}. Version {post.version}. Last changed{' '}
            <StaffTime value={post.updatedAt} />.
          </p>
          <p>
            Working revision: {post.workingRevisionId ?? 'None'}. Published revision:{' '}
            {post.publishedRevisionId ?? 'None'}.
          </p>
          {target && (
            <p>
              Proposed author: <strong>{target.displayName}</strong> ({target.email}).
            </p>
          )}
          {post.workflowState === 'IN_REVIEW' && (
            <p>Withdraw the active review before changing authorship.</p>
          )}
          <button
            ref={confirmationTrigger}
            type="button"
            className={buttonPrimary}
            disabled={
              blocked ||
              confirming ||
              !target ||
              target.id === post.author.id ||
              post.workflowState === 'IN_REVIEW' ||
              !!post.trashedAt
            }
            onClick={() => setConfirming(true)}
          >
            Review author reassignment
          </button>
        </div>
      )}
      {confirming && post && target && (
        <ConfirmAction
          returnFocusRef={confirmationTrigger}
          title="Confirm author reassignment"
          confirmLabel="Reassign author"
          busy={command.busy}
          disabled={blocked}
          onCancel={command.pending ? undefined : () => setConfirming(false)}
          onConfirm={() => void reassign()}
        >
          <p>
            Move <strong>{post.workingRevision?.content.title || post.slug || 'this draft'}</strong>{' '}
            from <strong>{post.author.displayName}</strong> to <strong>{target.displayName}</strong>
            . The new author gains working access, and the prior author may lose it. This creates a
            new draft revision and records the attribution change in the audit log.
          </p>
          <p>
            Review and publish the new working revision separately. This action does not publish it.
          </p>
        </ConfirmAction>
      )}
      <AdminCommandRecovery
        command={command}
        onRetry={() => void reassign(true)}
        onCheck={latest}
        onReviewed={() => {
          setConfirming(false);
          requireRefresh(false);
        }}
      />
      {post && (
        <button
          type="button"
          className={buttonSecondary}
          disabled={!canRefresh}
          onClick={() => {
            void guarded(async () => {
              await latest();
              await loadPosts();
              requireRefresh(false);
              setConfirming(false);
              command.clearError();
              setNotice(
                'Latest article loaded. Your proposed author was kept. Compare current ownership and review again.',
              );
            });
          }}
        >
          Load latest article ownership
        </button>
      )}
      <p role="status">{notice}</p>
    </section>
  );
}
