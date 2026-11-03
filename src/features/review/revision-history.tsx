'use client';

import { useEffect, useEffectEvent, useRef, useState } from 'react';
import Link from 'next/link';
import { ContractError } from '@/lib/api-contract';
import { staffRequest, notifyStaffAccess } from '@/features/staff/staff-api';
import { ConfirmAction, StaffError, StaffTime } from '@/features/staff/staff-ui';
import { editorApi } from '@/features/editor/editor-api';
import { type WorkspacePost, type EditorConfiguration } from '@/features/editor/editor-contract';
import {
  validateRevisionSummaries,
  validateReviewEvents,
  reviewActionLabel,
  workspaceForPost,
  revisionForRequest,
  type Revision,
  type RevisionSummary,
  type ReviewEvent,
} from './review-contract';
import { RevisionSnapshot } from './revision-snapshot';
import { postCommand, usePostCommand } from './use-post-command';

export function RevisionHistory({ postId }: { postId: string }) {
  const [post, setPost] = useState<WorkspacePost | null>(null);
  const [revisions, setRevisions] = useState<RevisionSummary[]>([]);
  const [events, setEvents] = useState<ReviewEvent[]>([]);
  const [revisionCursor, setRevisionCursor] = useState<string | null>(null);
  const [eventCursor, setEventCursor] = useState<string | null>(null);
  const [selected, setSelected] = useState<Revision | null>(null);
  const [configuration, setConfiguration] = useState<EditorConfiguration | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(true);
  const [confirm, setConfirm] = useState(false);
  const confirmationTrigger = useRef<HTMLButtonElement>(null);
  const loadRevisions = async (cursor?: string) => {
    const query = new URLSearchParams({ pageSize: '20' });
    if (cursor) query.set('cursor', cursor);
    const result = await staffRequest(`/posts/${postId}/revisions?${query}`, (value) =>
      validateRevisionSummaries(value, postId),
    );
    if (result.pagination?.kind !== 'CURSOR') throw new ContractError();
    setRevisions((previous) =>
      cursor
        ? [
            ...previous,
            ...result.data.filter((item) => !previous.some((old) => item.id === old.id)),
          ]
        : result.data,
    );
    setRevisionCursor(result.pagination.nextCursor);
  };
  const loadEvents = async (cursor?: string) => {
    const query = new URLSearchParams({ pageSize: '20' });
    if (cursor) query.set('cursor', cursor);
    const result = await staffRequest(`/posts/${postId}/review-events?${query}`, (value) =>
      validateReviewEvents(value, postId),
    );
    if (result.pagination?.kind !== 'CURSOR') throw new ContractError();
    setEvents((previous) =>
      cursor
        ? [
            ...previous,
            ...result.data.filter((item) => !previous.some((old) => item.id === old.id)),
          ]
        : result.data,
    );
    setEventCursor(result.pagination.nextCursor);
  };
  const command = usePostCommand(async (current) => {
    setPost(current);
    setConfirm(false);
    await Promise.all([loadRevisions(), loadEvents()]);
  });
  const load = async () => {
    setBusy(true);
    setError(null);
    setConfirm(false);
    try {
      const current = await staffRequest(`/posts/${postId}`, (value) =>
        workspaceForPost(value, postId),
      );
      await Promise.all([loadRevisions(), loadEvents()]);
      setPost(current.data);
      command.acknowledgeRefresh();
      try {
        setConfiguration(await editorApi.getConfig());
      } catch (configurationError) {
        notifyStaffAccess(configurationError);
        setConfiguration(null);
      }
    } catch (caught) {
      setPost(null);
      setRevisions([]);
      setEvents([]);
      setSelected(null);
      setError(caught);
    } finally {
      setBusy(false);
    }
  };
  const initialLoad = useEffectEvent(load);
  useEffect(() => {
    void Promise.resolve().then(() => initialLoad());
  }, [postId]);
  const runRead = async (read: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await read();
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  };
  const select = async (id: string) => {
    setConfirm(false);
    setSelected(null);
    await runRead(async () => {
      const result = await staffRequest(`/posts/${postId}/revisions/${id}`, (value) => {
        return revisionForRequest(value, postId, id);
      });
      setSelected(result.data);
    });
  };
  return (
    <section className="staff-workspace" aria-labelledby="history-heading">
      <Link href={`/studio/posts/${postId}`} prefetch={false} className="text-link">
        Back to working draft
      </Link>
      <p className="eyebrow">Immutable record</p>
      <h1 id="history-heading">Revision and review history</h1>
      <p>
        Revisions cannot be edited. Restoring creates a new working revision without publishing it.
      </p>
      <StaffError error={error ?? command.error} />
      <div className="staff-actions">
        <button
          className="button-secondary"
          disabled={busy || command.busy || command.uncertain}
          onClick={() => void load()}
        >
          Refresh history
        </button>
        {command.uncertain && (
          <button
            className="button-primary"
            disabled={command.busy}
            onClick={() => void command.execute()}
          >
            Retry the same revision restore
          </button>
        )}
      </div>
      {busy && <p role="status">Loading history…</p>}
      {command.notice && <p role="status">{command.notice}</p>}
      {post && (
        <>
          <p>
            Working revision <code>{post.workingRevisionId ?? 'None'}</code> · Published revision{' '}
            <code>{post.publishedRevisionId ?? 'None'}</code>.
          </p>
          <div className="staff-grid">
            <section className="staff-card">
              <h2>Saved revisions</h2>
              <ol>
                {revisions.map((revision) => (
                  <li key={revision.id}>
                    <button
                      type="button"
                      className="button-secondary"
                      disabled={busy || command.busy || command.uncertain}
                      onClick={() => void select(revision.id)}
                    >
                      Read revision {revision.number}: {revision.title || 'Untitled'}
                    </button>
                    <p>
                      {revision.createdBy.displayName} · <StaffTime value={revision.createdAt} />
                    </p>
                  </li>
                ))}
              </ol>
              {!revisions.length && <p>No saved revisions.</p>}
              {revisionCursor && (
                <button
                  className="button-secondary"
                  disabled={busy || command.busy || command.uncertain || command.needsRefresh}
                  onClick={() => void runRead(() => loadRevisions(revisionCursor))}
                >
                  Load older revisions
                </button>
              )}
            </section>
            <section className="staff-card">
              <h2>Review activity</h2>
              <ol>
                {events.map((event) => (
                  <li key={event.id}>
                    <strong>{reviewActionLabel(event.action)}</strong>
                    <p>
                      {event.actor.displayName} · <StaffTime value={event.createdAt} />
                    </p>
                    <p>
                      Revision <code>{event.revisionId}</code>
                    </p>
                    {event.feedback && <blockquote>{event.feedback}</blockquote>}
                  </li>
                ))}
              </ol>
              {!events.length && <p>No review activity.</p>}
              {eventCursor && (
                <button
                  className="button-secondary"
                  disabled={busy || command.busy || command.uncertain || command.needsRefresh}
                  onClick={() => void runRead(() => loadEvents(eventCursor))}
                >
                  Load older review activity
                </button>
              )}
            </section>
          </div>
          {selected && (
            <>
              <RevisionSnapshot
                revision={selected}
                configuration={configuration}
                label="Historical revision"
              />
              {post.allowedActions.includes('RESTORE_REVISION') ? (
                <button
                  ref={confirmationTrigger}
                  className="button-primary"
                  disabled={busy || command.busy || command.uncertain || command.needsRefresh}
                  onClick={() => setConfirm(true)}
                >
                  Restore revision {selected.number} to working draft
                </button>
              ) : (
                <p>
                  Restoration is unavailable in the current workflow. In-review work must be
                  withdrawn before changing its working revision.
                </p>
              )}
              {confirm && (
                <ConfirmAction
                  returnFocusRef={confirmationTrigger}
                  title={`Restore revision ${selected.number} as a draft?`}
                  confirmLabel="Confirm restore to working draft"
                  busy={command.busy}
                  disabled={busy || command.uncertain || command.needsRefresh}
                  onCancel={() => setConfirm(false)}
                  onConfirm={() =>
                    void command.execute(
                      postCommand(post, 'restore-revision', { revisionId: selected.id }),
                    )
                  }
                >
                  <p>
                    This creates a new working revision from the selected immutable snapshot. Your
                    existing public snapshot stays unchanged. Any device-only changes should be
                    synced or exported before returning to this draft.
                  </p>
                </ConfirmAction>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
