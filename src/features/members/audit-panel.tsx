'use client';

import { buttonSecondary, studio } from '@/components/ui/styles';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { staffRequest, StaffApiError } from '@/features/staff/staff-api';
import { ListHead, StaffCursorPagination, StaffError, StaffTime } from '@/features/staff/staff-ui';
import { STAFF_PAGE_SIZE, useCursorPager } from '@/features/staff/use-cursor-pager';
import type { CursorPagination } from '@/features/editor/editor-contract';
import { adminList, validateAuditEvent, type AuditEvent } from './admin-contract';

const AUDIT_FILTERS = ['subjectType', 'subjectId', 'action'] as const;

export function AuditPanel() {
  const pager = useCursorPager('audit', AUDIT_FILTERS);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [page, setPage] = useState<CursorPagination | null>(null);
  const [subjectType, setSubjectType] = useState(pager.filters.subjectType);
  const [subjectId, setSubjectId] = useState(pager.filters.subjectId);
  const [action, setAction] = useState(pager.filters.action);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [notice, setNotice] = useState('');
  const loadEpoch = useRef(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const focusAfterLoad = useRef(false);
  async function load() {
    const epoch = ++loadEpoch.current;
    // The URL is the source of truth, also for loads started by stale callbacks.
    const { cursor, filters } = pager.read();
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ pageSize: String(STAFF_PAGE_SIZE) });
      if (filters.subjectType) query.set('subjectType', filters.subjectType);
      if (filters.subjectId) query.set('subjectId', filters.subjectId);
      if (filters.action) query.set('action', filters.action);
      if (cursor) query.set('cursor', cursor);
      const result = await staffRequest(
        `/admin/audit-events?${query}`,
        adminList(validateAuditEvent),
      );
      if (epoch !== loadEpoch.current) return;
      if (result.pagination?.kind !== 'CURSOR') throw new Error('Audit pagination is unavailable.');
      setEvents(result.data);
      setPage(result.pagination);
      if (focusAfterLoad.current) heading.current?.focus();
    } catch (failure) {
      if (epoch !== loadEpoch.current) return;
      if (failure instanceof StaffApiError && failure.code === 'INVALID_CURSOR' && cursor) {
        setNotice('That page link expired. Showing the newest audit events.');
        pager.recover();
        return;
      }
      setEvents([]);
      setPage(null);
      setError(failure);
    } finally {
      if (epoch === loadEpoch.current) {
        setLoading(false);
        focusAfterLoad.current = false;
      }
    }
  }
  const loadLocation = useEffectEvent(() => {
    // Back/Forward and shared links decide the applied filters; show them in the inputs.
    setSubjectType(pager.filters.subjectType);
    setSubjectId(pager.filters.subjectId);
    setAction(pager.filters.action);
    void load();
  });
  const invalidateLoads = useEffectEvent(() => {
    loadEpoch.current++;
  });
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) loadLocation();
    });
    return () => {
      cancelled = true;
      invalidateLoads();
    };
  }, [pager.locationKey]);
  function turn(move: () => void) {
    setNotice('');
    focusAfterLoad.current = true;
    move();
  }
  return (
    <section className={studio.section} aria-labelledby="audit-heading">
      <h2 id="audit-heading" ref={heading} tabIndex={-1}>
        Staff audit log
      </h2>
      <p>
        Server-recorded actions identify the acting staff member, affected resource and time. Audit
        entries are read-only.
      </p>
      <form
        className={studio.filters}
        onSubmit={(event) => {
          event.preventDefault();
          setNotice('');
          if (!pager.applyFilters({ subjectType, subjectId, action })) void load();
        }}
      >
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
        <button type="submit" className={buttonSecondary} disabled={loading}>
          Apply audit filters
        </button>
      </form>
      {notice && <p role="status">{notice}</p>}
      <StaffError error={error} />
      {loading ? (
        <p role="status">Loading audit events…</p>
      ) : !error && !events.length ? (
        <p>No audit events match these filters.</p>
      ) : null}
      <div className={studio.table}>
        <ListHead
          columns={['Event', 'Actor · time', 'Subject']}
          template="lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.2fr)]"
        />
        <ol className={`staff-list ${studio.rows}`}>
          {events.map((event) => (
            <li key={event.id} className={studio.row}>
              <article className="grid min-w-0 gap-x-6 gap-y-1.5 lg:items-start lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.2fr)] [&>details]:col-span-full">
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
      <StaffCursorPagination
        kind="audit events"
        count={events.length}
        pageSize={STAFF_PAGE_SIZE}
        pageNumber={pager.position.pageNumber}
        canGoBack={pager.position.previous !== null}
        canReturnToNewest={pager.position.canReturnToNewest}
        hasMore={!!(page?.hasMore && page.nextCursor)}
        disabled={loading}
        onPrevious={() => turn(pager.previous)}
        onNewest={() => turn(pager.newest)}
        onNext={() => turn(() => pager.next(page!.nextCursor!))}
      />
      <div className={studio.actions}>
        <button
          type="button"
          className={buttonSecondary}
          disabled={loading}
          onClick={() => {
            setNotice('');
            void load();
          }}
        >
          Refresh audit log
        </button>
      </div>
    </section>
  );
}
