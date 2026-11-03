'use client';

import { useEffect, useEffectEvent, useState } from 'react';
import Link from 'next/link';
import { staffRequest } from '@/features/staff/staff-api';
import { StaffError, StaffTime } from '@/features/staff/staff-ui';
import {
  validateWorkspaceSummary,
  type WorkspacePostSummary,
} from '@/features/editor/editor-contract';
import { ContractError } from '@/lib/api-contract';

export function ReviewQueue() {
  const [items, setItems] = useState<WorkspacePostSummary[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const load = async (next?: string) => {
    setBusy(true);
    setError(null);
    try {
      const query = new URLSearchParams({
        scope: 'ALL',
        workflowState: 'IN_REVIEW',
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
  }, []);
  return (
    <section className="staff-workspace" aria-labelledby="review-heading">
      <p className="eyebrow">Editorial desk</p>
      <h1 id="review-heading">Review workspace</h1>
      <p>
        Read the submitted revision beside its published snapshot. Review and publish commits the
        exact revision you select.
      </p>
      <div className="staff-actions">
        <button className="button-secondary" disabled={busy} onClick={() => void load()}>
          Refresh review queue
        </button>
      </div>
      <StaffError error={error} />
      {busy && <p role="status">Loading submitted work…</p>}
      {loaded && !items.length && <p>No revisions are waiting for review.</p>}
      <div className="staff-grid">
        {items.map((post) => (
          <article className="staff-card" key={post.id}>
            <h2>Submission by {post.author.displayName}</h2>
            <p>
              {post.publicationState === 'PUBLISHED'
                ? 'A published article has changes awaiting review.'
                : 'This article is not currently public.'}
            </p>
            <p>
              Submitted revision <code>{post.workingRevisionId}</code>
            </p>
            <p>
              Updated <StaffTime value={post.updatedAt} />
            </p>
            <Link className="text-link" href={`/studio/review/${post.id}`} prefetch={false}>
              Review submitted revision
            </Link>
          </article>
        ))}
      </div>
      {cursor && (
        <button className="button-secondary" disabled={busy} onClick={() => void load(cursor)}>
          Load more submissions
        </button>
      )}
    </section>
  );
}
