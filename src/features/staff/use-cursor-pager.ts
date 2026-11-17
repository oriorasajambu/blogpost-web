'use client';

import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  advance,
  NEWEST,
  parseTrail,
  position,
  trailKey,
  type TrailPosition,
} from './cursor-trail';

/** Staff lists page by 25; the API accepts up to 50. */
export const STAFF_PAGE_SIZE = 25;

const memory = new Map<string, string[]>();
const noSubscription = () => () => {};
function readTrail(key: string): string[] {
  try {
    if (typeof window !== 'undefined') {
      const stored = window.sessionStorage.getItem(key);
      if (stored !== null) return parseTrail(stored);
    }
  } catch {}
  return memory.get(key) ?? [NEWEST];
}
function writeTrail(key: string, trail: string[]) {
  memory.set(key, trail);
  try {
    window.sessionStorage.setItem(key, JSON.stringify(trail));
  } catch {}
}

export interface CursorPager<F extends string> {
  cursor: string;
  filters: Readonly<Record<F, string>>;
  /** Changes whenever the cursor or applied filters in the URL change. */
  locationKey: string;
  position: TrailPosition;
  /** The applied cursor and filters in the URL right now, for async work that outlives a render. */
  read(): { cursor: string; filters: Readonly<Record<F, string>> };
  next(nextCursor: string): void;
  previous(): void;
  newest(): void;
  /** Returns false when the filters and page are already applied, so the caller reloads itself. */
  applyFilters(filters: Readonly<Record<F, string>>): boolean;
  /** Replaces an unusable cursor (expired or invalid) with the newest page. */
  recover(): void;
}

/**
 * Keeps one list's cursor and applied filters in the URL (`{list}Cursor`, `{list}.{filter}`), so
 * refresh, shared links and browser Back/Forward restore the same page. Position is derived from
 * the URL's cursor within the remembered trail, never from push/pop counts.
 */
export function useCursorPager<F extends string>(
  list: string,
  filterNames: readonly F[],
): CursorPager<F> {
  const params = useSearchParams();
  const cursorKey = `${list}Cursor`;
  const cursor = params.get(cursorKey) ?? NEWEST;
  const filterValues = filterNames.map((name) => params.get(`${list}.${name}`) ?? '');
  const filterSignature = filterValues.join('\u0000');
  const filters = useMemo(
    () =>
      Object.fromEntries(
        filterNames.map((name, index) => [name, filterSignature.split('\u0000')[index] ?? '']),
      ) as Record<F, string>,
    // filterNames is a static list per panel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filterSignature],
  );
  const key = trailKey(list, filters);
  const [revision, setRevision] = useState(0);
  // The server and the hydrating client both start from an unknown trail; the stored trail is
  // read only after hydration, so the first client render matches the server HTML.
  const hydrated = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
  const trail = useMemo(
    () => (hydrated ? readTrail(key) : [NEWEST]),
    // revision re-reads the trail after this hook writes it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hydrated, key, revision],
  );

  const go = useCallback(
    (nextCursor: string, nextFilters: Readonly<Record<F, string>>, mode: 'push' | 'replace') => {
      const url = new URL(window.location.href);
      if (nextCursor) url.searchParams.set(cursorKey, nextCursor);
      else url.searchParams.delete(cursorKey);
      for (const name of filterNames) {
        const value = nextFilters[name];
        if (value) url.searchParams.set(`${list}.${name}`, value);
        else url.searchParams.delete(`${list}.${name}`);
      }
      const target = `${url.pathname}${url.search}${url.hash}`;
      if (mode === 'push') window.history.pushState(null, '', target);
      else window.history.replaceState(null, '', target);
    },
    // filterNames is a static list per panel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [list, cursorKey],
  );

  const read = useCallback(() => {
    const search = new URLSearchParams(window.location.search);
    return {
      cursor: search.get(cursorKey) ?? NEWEST,
      filters: Object.fromEntries(
        filterNames.map((name) => [name, search.get(`${list}.${name}`) ?? '']),
      ) as Record<F, string>,
    };
    // filterNames is a static list per panel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, cursorKey]);

  const current = position(trail, cursor);
  return {
    cursor,
    filters,
    locationKey: `${cursor}\u0001${filterSignature}`,
    position: current,
    read,
    next(nextCursor) {
      writeTrail(key, advance(trail, cursor, nextCursor));
      setRevision((value) => value + 1);
      go(nextCursor, filters, 'push');
    },
    previous() {
      if (current.previous !== null) go(current.previous, filters, 'push');
    },
    newest() {
      if (cursor !== NEWEST) go(NEWEST, filters, 'push');
    },
    applyFilters(nextFilters) {
      // Compare with the URL now, not this render: callers may run after later navigation.
      const now = read();
      if (
        now.cursor === NEWEST &&
        filterNames.every((name) => nextFilters[name] === now.filters[name])
      )
        return false;
      writeTrail(trailKey(list, nextFilters), [NEWEST]);
      setRevision((value) => value + 1);
      go(NEWEST, nextFilters, 'push');
      return true;
    },
    recover() {
      go(NEWEST, filters, 'replace');
    },
  };
}
