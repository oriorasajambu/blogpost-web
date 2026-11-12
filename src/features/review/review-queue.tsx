'use client';

import { buttonSecondary, eyebrow, studio, textLink } from '@/components/ui/styles';
import { useEffect, useEffectEvent, useState } from 'react';
import Link from 'next/link';
import { staffRequest } from '@/features/staff/staff-api';
import { ListHead, StaffError, StaffTime } from '@/features/staff/staff-ui';
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
    <section className={studio.workspace} aria-labelledby="review-heading">
      <header className={studio.pageHead}>
        <div className={studio.pageTitle}>
          <p className={eyebrow}>Editorial desk</p>
          <h1 id="review-heading">Review workspace</h1>
          <p>
            Read the submitted revision beside its published snapshot. Review and publish commits
            the exact revision you select.
          </p>
        </div>
        <div className={studio.actions}>
          <button className={buttonSecondary} disabled={busy} onClick={() => void load()}>
            Refresh review queue
          </button>
        </div>
      </header>
      <StaffError error={error} />
      {busy && <p role="status">Loading submitted work…</p>}
      {loaded && !items.length && <p>No revisions are waiting for review.</p>}
      <div className={studio.table}>
        <ListHead
          columns={['Submission', 'Submitted revision', 'Updated', '']}
          template="md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.3fr)_minmax(0,1fr)_auto]"
        />
        <div className="grid divide-y divide-hairline">
          {items.map((post) => (
            <article
              className={`${studio.row} md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.3fr)_minmax(0,1fr)_auto] md:[&>h2]:col-start-1 md:[&>h2]:row-start-1 md:[&>p:nth-of-type(1)]:col-start-1 md:[&>p:nth-of-type(1)]:row-start-2 md:[&>p:nth-of-type(2)]:col-start-2 md:[&>p:nth-of-type(2)]:row-start-1 md:[&>p:nth-of-type(3)]:col-start-3 md:[&>p:nth-of-type(3)]:row-start-1 md:[&>a]:col-start-4 md:[&>a]:row-start-1`}
              key={post.id}
            >
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
              <Link className={textLink} href={`/studio/review/${post.id}`} prefetch={false}>
                Review submitted revision
              </Link>
            </article>
          ))}
        </div>
      </div>
      {cursor && (
        <button className={buttonSecondary} disabled={busy} onClick={() => void load(cursor)}>
          Load more submissions
        </button>
      )}
    </section>
  );
}
