'use client';

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
    <section className="staff-workspace" aria-labelledby="publication-workspace-heading">
      <header>
        <p className="eyebrow">Publication workspace</p>
        <h2 id="publication-workspace-heading">Browse staff articles</h2>
        <p>Working revisions stay private until an editor reviews and publishes them.</p>
      </header>
      <form className="staff-filters" action="/studio/posts" method="get">
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
        <button className="button-secondary" type="submit">
          Apply filters
        </button>
      </form>
      <StaffError error={error} />
      {busy && <p role="status">Loading staff articles…</p>}
      {!busy && !error && !posts.length && <p>No articles match these filters.</p>}
      <ul className="staff-post-list">
        {posts.map((post) => (
          <li key={post.id} className="staff-card">
            <h3>
              <Link prefetch={false} href={`/studio/posts/${post.id}`}>
                {post.slug || `Unpublished article by ${post.author.displayName}`}
              </Link>
            </h3>
            <p>
              {post.author.displayName} ·{' '}
              {post.publicationState === 'PUBLISHED'
                ? 'Published'
                : post.publicationState === 'WITHDRAWN'
                  ? 'Withdrawn from public view'
                  : 'Never published'}{' '}
              · {post.workflowState.replaceAll('_', ' ').toLowerCase()}
            </p>
            <p className="staff-muted">
              Working revision: {post.workingRevisionId ?? 'none'}
              <br />
              Published revision: {post.publishedRevisionId ?? 'none'}
              {post.publishedRevisionId && post.publishedRevisionId !== post.workingRevisionId
                ? ' · Unpublished working changes'
                : ''}
            </p>
            <p className="staff-muted">
              Updated <StaffTime value={post.updatedAt} /> · version {post.version}
            </p>
            <Link prefetch={false} className="text-link" href={`/studio/posts/${post.id}/history`}>
              Revision history
            </Link>
          </li>
        ))}
      </ul>
      <div className="staff-actions">
        {Boolean(error) && (
          <button
            className="button-secondary"
            type="button"
            disabled={busy}
            onClick={() => void load()}
          >
            Retry article list
          </button>
        )}
        {cursor && (
          <button
            className="button-secondary"
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
