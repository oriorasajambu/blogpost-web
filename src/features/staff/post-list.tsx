'use client';
import { ListHead } from '@/features/staff/staff-ui';

import { buttonSecondary, eyebrow, studio, textLink } from '@/components/ui/styles';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  validateWorkspaceSummary,
  type WorkspacePostSummary,
} from '@/features/editor/editor-contract';
import { staffRequest, StaffApiError } from './staff-api';
import { StaffError, StaffTime } from './staff-ui';
import {
  publicationFilters,
  workflowFilters,
  staffPostQuery,
  type PostFilters,
} from './post-list-policy';

export function StaffPostList({ filters, memberId }: { filters: PostFilters; memberId: string }) {
  const [posts, setPosts] = useState<WorkspacePostSummary[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const epoch = useRef(0);
  const invalidate = useCallback(() => {
    epoch.current++;
  }, []);
  const load = useCallback(
    async (next?: string) => {
      const request = ++epoch.current;
      setBusy(true);
      setError(null);
      try {
        const result = await staffRequest(`/posts?${staffPostQuery(filters, next)}`, (value) => {
          if (!Array.isArray(value) || value.length > 50) throw new Error();
          return value.map(validateWorkspaceSummary);
        });
        if (result.pagination?.kind !== 'CURSOR')
          throw new StaffApiError('INVALID_API_RESPONSE', 502);
        if (epoch.current !== request) return;
        setPosts((current) =>
          next
            ? [
                ...current.filter((post) => !result.data.some((item) => item.id === post.id)),
                ...result.data,
              ]
            : result.data,
        );
        setCursor(result.pagination.nextCursor);
      } catch (reason) {
        if (epoch.current === request) setError(reason);
      } finally {
        if (epoch.current === request) setBusy(false);
      }
    },
    [filters],
  );
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void load();
    });
    return () => {
      active = false;
      invalidate();
    };
  }, [load, memberId, invalidate]);
  return (
    <section className={studio.workspace} aria-labelledby="publication-workspace-heading">
      <header className="mt-6 flex flex-col gap-2 [&>h2]:text-2xl [&>p:last-child]:text-sm [&>p:last-child]:text-muted">
        <p className={eyebrow}>Publication workspace</p>
        <h2 id="publication-workspace-heading">Browse staff articles</h2>
        <p>Working revisions stay private until an editor reviews and publishes them.</p>
      </header>
      <form className={studio.filters} action="/studio/posts" method="get">
        <label>
          Ownership
          <select name="scope" defaultValue={filters.scope}>
            <option value="OWN">My articles</option>
            <option value="ALL">All staff articles</option>
          </select>
        </label>
        <label>
          Publication
          <select name="publicationState" defaultValue={filters.publicationState}>
            <option value="">Any publication state</option>
            {publicationFilters.map((value) => (
              <option key={value} value={value}>
                {value.replaceAll('_', ' ').toLowerCase()}
              </option>
            ))}
          </select>
        </label>
        <label>
          Workflow
          <select name="workflowState" defaultValue={filters.workflowState}>
            <option value="">Any workflow</option>
            {workflowFilters.map((value) => (
              <option key={value} value={value}>
                {value.replaceAll('_', ' ').toLowerCase()}
              </option>
            ))}
          </select>
        </label>
        <button className={buttonSecondary} type="submit">
          Apply filters
        </button>
      </form>
      <StaffError error={error} />
      {busy && <p role="status">Loading staff articles…</p>}
      {!busy && !error && !posts.length && <p>No articles match these filters.</p>}
      <div className={studio.table}>
        <ListHead
          columns={['Article', 'Publication · workflow', 'Updated', '']}
          template="md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,0.9fr)_auto]"
        />
        <ul className={`staff-post-list ${studio.rows}`}>
          {posts.map((post) => (
            <li
              key={post.id}
              className={`${studio.row} md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,0.9fr)_auto] md:[&>h3]:col-start-1 md:[&>h3]:row-start-1 md:[&>p:nth-of-type(1)]:col-start-2 md:[&>p:nth-of-type(1)]:row-start-1 md:[&>p:nth-of-type(2)]:col-start-1 md:[&>p:nth-of-type(2)]:row-start-2 md:[&>p:nth-of-type(3)]:col-start-3 md:[&>p:nth-of-type(3)]:row-start-1 md:[&>a]:col-start-4 md:[&>a]:row-start-1 [&>h3_a]:text-text [&>h3_a]:no-underline [&>h3_a:hover]:text-accent-ink`}
            >
              <h3>
                <Link prefetch={false} href={`/studio/posts/${post.id}`}>
                  {post.slug || `Unpublished article by ${post.author.displayName}`}
                </Link>
              </h3>
              <p className="flex flex-wrap items-center gap-2">
                <span className="sr-only">{post.author.displayName} · </span>
                <span
                  className={studio.statusChip}
                  data-tone={post.publicationState === 'PUBLISHED' ? 'success' : undefined}
                >
                  {post.publicationState === 'PUBLISHED'
                    ? 'Published'
                    : post.publicationState === 'WITHDRAWN'
                      ? 'Withdrawn from public view'
                      : 'Never published'}
                </span>
                <span className="sr-only"> · </span>
                <span
                  className={studio.statusChip}
                  data-tone={
                    post.workflowState === 'IN_REVIEW'
                      ? 'warning'
                      : post.workflowState === 'CHANGES_REQUESTED'
                        ? 'danger'
                        : undefined
                  }
                >
                  {post.workflowState.replaceAll('_', ' ').toLowerCase()}
                </span>
              </p>
              <p className={studio.muted}>
                <span aria-hidden="true">{post.author.displayName} · </span>
                Working revision: {post.workingRevisionId ?? 'none'}
                <br />
                Published revision: {post.publishedRevisionId ?? 'none'}
                {post.publishedRevisionId && post.publishedRevisionId !== post.workingRevisionId
                  ? ' · Unpublished working changes'
                  : ''}
              </p>
              <p className={studio.muted}>
                Updated <StaffTime value={post.updatedAt} /> · version {post.version}
              </p>
              <Link prefetch={false} className={textLink} href={`/studio/posts/${post.id}/history`}>
                Revision history
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div className={studio.actions}>
        {Boolean(error) && (
          <button
            className={buttonSecondary}
            type="button"
            disabled={busy}
            onClick={() => void load()}
          >
            Retry article list
          </button>
        )}
        {cursor && (
          <button
            className={buttonSecondary}
            type="button"
            disabled={busy}
            onClick={() => void load(cursor)}
          >
            Load more staff articles
          </button>
        )}
      </div>
    </section>
  );
}
