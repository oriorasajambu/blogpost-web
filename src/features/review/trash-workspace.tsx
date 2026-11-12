'use client';

import { buttonPrimary, buttonSecondary, eyebrow, studio, textLink } from '@/components/ui/styles';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import Link from 'next/link';
import type { StaffMember } from '@/lib/auth-contract';
import { ContractError } from '@/lib/api-contract';
import { staffRequest } from '@/features/staff/staff-api';
import { ConfirmAction, ListHead, StaffError, StaffTime } from '@/features/staff/staff-ui';
import {
  validateWorkspaceSummary,
  type WorkspacePost,
  type WorkspacePostSummary,
} from '@/features/editor/editor-contract';
import { workspaceForPost } from './review-contract';
import { postCommand, usePostCommand } from './use-post-command';

export function TrashWorkspace({ member }: { member: StaffMember }) {
  const [items, setItems] = useState<WorkspacePostSummary[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [selection, setSelection] = useState<WorkspacePost | null>(null);
  const confirmationTrigger = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const command = usePostCommand((current) => {
    setSelection(null);
    setItems((previous) => previous.filter((item) => item.id !== current.id));
  });
  const load = async (next?: string) => {
    setBusy(true);
    setError(null);
    setSelection(null);
    try {
      const query = new URLSearchParams({
        trashed: 'true',
        scope: member.role === 'AUTHOR' ? 'OWN' : 'ALL',
        pageSize: '20',
      });
      if (next) query.set('cursor', next);
      const result = await staffRequest(`/posts?${query}`, (value) => {
        if (!Array.isArray(value) || value.length > 50) throw new ContractError();
        return value.map(validateWorkspaceSummary);
      });
      if (result.pagination?.kind !== 'CURSOR') throw new ContractError();
      setItems((previous) =>
        next
          ? [
              ...previous,
              ...result.data.filter((post) => !previous.some((item) => item.id === post.id)),
            ]
          : result.data,
      );
      setCursor(result.pagination.nextCursor);
      setLoaded(true);
      command.acknowledgeRefresh();
    } catch (caught) {
      setItems([]);
      setLoaded(false);
      setError(caught);
    } finally {
      setBusy(false);
    }
  };
  const initialLoad = useEffectEvent(load);
  useEffect(() => {
    void Promise.resolve().then(() => initialLoad());
  }, [member.role]);
  const select = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      setSelection(
        (await staffRequest(`/posts/${id}`, (value) => workspaceForPost(value, id))).data,
      );
    } catch (caught) {
      setSelection(null);
      setError(caught);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className={studio.workspace} aria-labelledby="trash-heading">
      <header className={studio.pageHead}>
        <div className={studio.pageTitle}>
          <p className={eyebrow}>Recoverable work</p>
          <h1 id="trash-heading">Trash</h1>
          <p>
            Trashed articles are unavailable to new public requests. Restore before the purge date
            to recover an unpublished draft.
          </p>
        </div>
      </header>
      <StaffError error={error ?? command.error} />
      <div className={studio.actions}>
        <button
          className={buttonSecondary}
          disabled={busy || command.busy || command.uncertain}
          onClick={() => void load()}
        >
          Refresh trash
        </button>
        {command.uncertain && (
          <button
            className={buttonPrimary}
            disabled={command.busy}
            onClick={() => void command.execute()}
          >
            Retry the same trash restore
          </button>
        )}
      </div>
      {busy && <p role="status">Loading recoverable work…</p>}
      {command.notice && <p role="status">{command.notice}</p>}
      {loaded && !items.length && <p>No recoverable articles in trash.</p>}
      <div className={studio.table}>
        <ListHead
          columns={['Article', 'Owner', 'Moved · purge', '']}
          template="lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,12rem)]"
        />
        <div className="grid divide-y divide-hairline">
          {items.map((post) => (
            <article
              className={`${studio.row} lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,12rem)] lg:[&>h2]:col-start-1 lg:[&>h2]:row-start-1 lg:[&>p:nth-of-type(1)]:col-start-1 lg:[&>p:nth-of-type(1)]:row-start-2 lg:[&>p:nth-of-type(2)]:col-start-2 lg:[&>p:nth-of-type(2)]:row-start-1 lg:[&>p:nth-of-type(3)]:col-start-3 lg:[&>p:nth-of-type(3)]:row-start-1 lg:[&>p:nth-of-type(4)]:col-start-3 lg:[&>p:nth-of-type(4)]:row-start-2 lg:[&>div]:col-start-4 lg:[&>div]:row-span-2 lg:[&>div]:row-start-1`}
              key={post.id}
            >
              <h2>{post.slug || `Article by ${post.author.displayName}`}</h2>
              <p>
                Post <code>{post.id}</code>
              </p>
              <p>Owner: {post.author.displayName}</p>
              <p>Moved to trash {post.trashedAt && <StaffTime value={post.trashedAt} />}</p>
              <p>
                Permanent purge{' '}
                {post.purgeAfter ? <StaffTime value={post.purgeAfter} /> : 'date unavailable'}
              </p>
              <div className={studio.actions}>
                <Link
                  className={textLink}
                  href={`/studio/posts/${post.id}/history`}
                  prefetch={false}
                >
                  Read retained history
                </Link>
                {post.allowedActions.includes('RESTORE') && (
                  <button
                    className={buttonSecondary}
                    disabled={busy || command.busy || command.uncertain || command.needsRefresh}
                    onClick={(event) => {
                      confirmationTrigger.current = event.currentTarget;
                      void select(post.id);
                    }}
                  >
                    Restore as draft
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
      {cursor && (
        <button
          className={buttonSecondary}
          disabled={busy || command.busy || command.uncertain || command.needsRefresh}
          onClick={() => void load(cursor)}
        >
          Load more recoverable articles
        </button>
      )}
      {selection && (
        <ConfirmAction
          returnFocusRef={confirmationTrigger}
          title="Restore this unpublished draft?"
          confirmLabel="Confirm restore as draft"
          busy={command.busy}
          disabled={
            busy ||
            command.uncertain ||
            command.needsRefresh ||
            !selection.allowedActions.includes('RESTORE')
          }
          onCancel={() => setSelection(null)}
          onConfirm={() => void command.execute(postCommand(selection, 'restore', {}))}
        >
          <p>
            {selection.workingRevision?.content.title || 'Untitled article'} ·{' '}
            {selection.author.displayName}
          </p>
          <p>
            This recovers the retained revisions and returns the article to draft. It remains
            unavailable to public visitors until a new review and publication.
          </p>
          {selection.purgeAfter && (
            <p>
              Current purge deadline: <StaffTime value={selection.purgeAfter} />
            </p>
          )}
        </ConfirmAction>
      )}
    </section>
  );
}
