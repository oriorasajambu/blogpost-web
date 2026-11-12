'use client';

import { buttonSecondary, studio } from '@/components/ui/styles';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { staffRequest } from '@/features/staff/staff-api';
import { ListHead, StaffError, StaffTime } from '@/features/staff/staff-ui';
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
    <section className={studio.card} aria-labelledby="audit-heading">
      <h2 id="audit-heading">Staff audit log</h2>
      <p>
        Server-recorded actions identify the acting staff member, affected resource and time. Audit
        entries are read-only.
      </p>
      <form
        className={studio.form}
        onSubmit={(event) => {
          event.preventDefault();
          void load();
        }}
      >
        <div className={studio.grid}>
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
        <button type="submit" className={buttonSecondary} disabled={loading}>
          Apply audit filters
        </button>
      </form>
      <StaffError error={error} />
      {loading ? (
        <p role="status">Loading audit events…</p>
      ) : !error && !events.length ? (
        <p>No audit events match these filters.</p>
      ) : null}
      <div className={studio.table}>
        <ListHead
          columns={['Event', 'Actor · time', 'Subject']}
          template="md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.2fr)]"
        />
        <ol className={`staff-list ${studio.rows}`}>
          {events.map((event) => (
            <li key={event.id} className={studio.row}>
              <article className="grid min-w-0 gap-x-6 gap-y-1.5 md:items-start md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.2fr)] [&>details]:col-span-full">
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
      </div>
      <div className={studio.actions}>
        <button
          type="button"
          className={buttonSecondary}
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
            className={buttonSecondary}
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
