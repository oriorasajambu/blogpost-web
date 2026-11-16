/**
 * Forward-only API cursors become two-way pages by remembering the ordered trail of cursors
 * visited under one filter set. `''` is the newest page. A trail that does not start with `''`
 * began from a shared or reloaded URL whose earlier pages are unknown.
 */
export type CursorTrail = readonly string[];

export const NEWEST = '';

export interface TrailPosition {
  /** Index of the current cursor in the trail, or -1 when it is not part of it. */
  index: number;
  /** 1-based page number, known only when the trail reaches back to the newest page. */
  pageNumber: number | null;
  /** Cursor for the page before this one, when known. */
  previous: string | null;
  /** True when the current page is not the newest one. */
  canReturnToNewest: boolean;
}

export function position(trail: CursorTrail, cursor: string): TrailPosition {
  const index = trail.indexOf(cursor);
  const fromNewest = trail[0] === NEWEST;
  return {
    index,
    pageNumber: cursor === NEWEST ? 1 : fromNewest && index >= 0 ? index + 1 : null,
    previous: index > 0 ? trail[index - 1]! : null,
    canReturnToNewest: cursor !== NEWEST,
  };
}

/** Returns the trail after moving from `cursor` to the page that `next` opens. */
export function advance(trail: CursorTrail, cursor: string, next: string): string[] {
  if (!next || next === cursor) return [...trail];
  const index = trail.indexOf(cursor);
  const base = index >= 0 ? trail.slice(0, index + 1) : cursor === NEWEST ? [NEWEST] : [cursor];
  return [...base, next];
}

/** Trails are kept per list and filter set, so changing a filter starts over at the newest page. */
export function trailKey(list: string, filters: Readonly<Record<string, string>>): string {
  const pairs = Object.entries(filters)
    .filter(([, value]) => value !== '')
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `staff-pager:${list}:${new URLSearchParams(pairs).toString()}`;
}

/** Signed cursors are opaque but bounded; anything else in storage is ignored. */
export function parseTrail(value: string | null): string[] {
  if (!value) return [NEWEST];
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      Array.isArray(parsed) &&
      parsed.length > 0 &&
      parsed.length <= 500 &&
      parsed.every((entry) => typeof entry === 'string' && entry.length <= 2048)
    )
      return parsed as string[];
  } catch {}
  return [NEWEST];
}
