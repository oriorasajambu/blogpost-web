'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ArticleSkeleton } from '@/components/article/article-skeleton';
import { container } from '@/components/ui/styles';

const NavigationContext = createContext<{
  pending: boolean;
  update: (id: string, pending: boolean) => void;
}>({
  pending: false,
  update: () => undefined,
});

export function ReadingNavigation({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ReadonlySet<string>>(() => new Set());
  const update = useCallback((id: string, pending: boolean) => {
    setActive((previous) => {
      if (previous.has(id) === pending) return previous;
      const next = new Set(previous);
      if (pending) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);
  const value = useMemo(() => ({ pending: active.size > 0, update }), [active, update]);
  return (
    <NavigationContext.Provider value={value}>
      {children}
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {value.pending ? 'Loading page…' : ''}
      </span>
    </NavigationContext.Provider>
  );
}

export const useReadingNavigation = () => useContext(NavigationContext);

/** Client feedback does not flush a server loading boundary or turn an outage into HTTP 200. */
export function ReadingContent({ children }: { children: ReactNode }) {
  const { pending } = useReadingNavigation();
  const main = useRef<HTMLElement>(null);
  const needsFocus = useRef(false);
  useEffect(() => {
    if (pending) {
      needsFocus.current = true;
      return;
    }
    if (!needsFocus.current || !main.current) return;
    let frame = 0;
    const deadline = performance.now() + 5000;
    // A streamed route can briefly contain a hidden heading after pending clears.
    // Focus only once that heading is actually visible, including its ancestors.
    const focusVisibleTitle = () => {
      const headings = [...document.querySelectorAll('main h1')];
      const target =
        headings.find(
          (heading) =>
            heading.getClientRects().length > 0 &&
            getComputedStyle(heading).visibility === 'visible' &&
            !heading.closest('[inert]'),
        ) ?? (headings.length === 0 ? document.querySelector('main') : null);
      if (target instanceof HTMLElement && target.getClientRects().length > 0) {
        target.tabIndex = -1;
        target.focus({ preventScroll: true });
        if (document.activeElement === target) {
          needsFocus.current = false;
          return;
        }
      }
      // CSS visibility can settle at paint without another DOM mutation.
      if (performance.now() < deadline) frame = requestAnimationFrame(focusVisibleTitle);
    };
    frame = requestAnimationFrame(focusVisibleTitle);
    return () => cancelAnimationFrame(frame);
  }, [pending]);
  return (
    <main
      ref={main}
      id="main-content"
      className={`${container} relative min-h-[55vh]`}
      tabIndex={-1}
      aria-busy={pending || undefined}
    >
      <div className="inert:invisible" inert={pending} aria-hidden={pending || undefined}>
        {children}
      </div>
      {pending && (
        <div
          className="absolute inset-0 z-[2] min-h-[55vh] bg-bg px-4 pt-14 sm:px-6 lg:px-8"
          aria-label="Loading page"
          role="status"
        >
          <ArticleSkeleton announce={false} />
        </div>
      )}
    </main>
  );
}
