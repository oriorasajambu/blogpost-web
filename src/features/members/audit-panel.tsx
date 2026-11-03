'use client';

import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { staffRequest } from '@/features/staff/staff-api';
import { StaffError, StaffTime } from '@/features/staff/staff-ui';
import type { CursorPagination } from '@/features/editor/editor-contract';
import { adminList, validateAuditEvent, type AuditEvent } from './admin-contract';

export function AuditPanel() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [page, setPage] = useState<CursorPagination | null>(null);
  const [subjectType, setSubjectType] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [action, setAction] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const loadEpoch = useRef(0);
  async function load(cursor?: string) {
    const epoch = ++loadEpoch.current;
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ pageSize: '20' });
      if (subjectType) query.set('subjectType', subjectType);
      if (subjectId) query.set('subjectId', subjectId);
      if (action) query.set('action', action);
      if (cursor) query.set('cursor', cursor);
      const result = await staffRequest(
        `/admin/audit-events?${query}`,
        adminList(validateAuditEvent),
      );
      if (epoch !== loadEpoch.current) return;
      if (result.pagination?.kind !== 'CURSOR') throw new Error('Audit pagination is unavailable.');
      setEvents(result.data);
      setPage(result.pagination);
    } catch (failure) {
      if (epoch !== loadEpoch.current) return;
      setEvents([]);
      setPage(null);
      setError(failure);
    } finally {
      if (epoch === loadEpoch.current) setLoading(false);
    }
  }
  const initiallyLoad = useEffectEvent(() => load());
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
  return (
    <section className="staff-card" aria-labelledby="audit-heading">
      <h2 id="audit-heading">Staff audit log</h2>
      <p>
        Server-recorded actions identify the acting staff member, affected resource and time. Audit
        entries are read-only.
      </p>
      <form
        className="staff-form"
        onSubmit={(event) => {
          event.preventDefault();
          void load();
        }}
      >
        <div className="staff-grid">
          <label>
            Resource type
            <input
              value={subjectType}
              maxLength={40}
              onChange={(e) => setSubjectType(e.target.value)}
              placeholder="For example, MEMBER"
            />
          </label>
          <label>
            Resource ID
            <input
              value={subjectId}
              maxLength={36}
              pattern="[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}"
              onChange={(e) => setSubjectId(e.target.value)}
            />
          </label>
          <label>
            Action
            <input
              value={action}
              maxLength={80}
              onChange={(e) => setAction(e.target.value)}
              placeholder="For example, MEMBER_UPDATED"
            />
          </label>
        </div>
        <button type="submit" className="button-secondary" disabled={loading}>
          Apply audit filters
        </button>
      </form>
      <StaffError error={error} />
      {loading ? (
        <p role="status">Loading audit events…</p>
      ) : !error && !events.length ? (
        <p>No audit events match these filters.</p>
      ) : null}
      <ol className="staff-list">
        {events.map((event) => (
          <li key={event.id}>
            <article>
              <h3>{event.action.replaceAll('_', ' ').toLowerCase()}</h3>
              <p>
                {event.actor.displayName} ({event.actor.handle}) ·{' '}
                <StaffTime value={event.createdAt} />
              </p>
              <p>
                {event.subjectType} · <code>{event.subjectId}</code>
              </p>
              <details>
                <summary>Recorded changes</summary>
                <pre tabIndex={0}>{JSON.stringify(event.changes, null, 2)}</pre>
              </details>
            </article>
          </li>
        ))}
      </ol>
      <div className="staff-actions">
        <button
          type="button"
          className="button-secondary"
          disabled={loading}
          onClick={() => {
            void load();
          }}
        >
          Refresh audit log
        </button>
        {page?.hasMore && page.nextCursor && (
          <button
            type="button"
            className="button-secondary"
            disabled={loading}
            onClick={() => {
              void load(page.nextCursor!);
            }}
          >
            Next audit events
          </button>
        )}
      </div>
    </section>
  );
}
