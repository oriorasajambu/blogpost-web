'use client';

import { useEffect, useRef, useState } from 'react';
import type { OutlineItem } from '@/lib/article-reading';

/** Section links with the reader's current section marked; a disclosure on narrow screens. */
export function ArticleOutline({ items }: { items: OutlineItem[] }) {
  const [current, setCurrent] = useState(items[0]?.id);
  const [open, setOpen] = useState(true);
  useEffect(() => {
    // Keep in step with the `min-[1081px]` rail breakpoint on the article layout.
    const wide = matchMedia('(min-width: 1081px)');
    const sync = () => setOpen(wide.matches);
    sync();
    wide.addEventListener('change', sync);
    const headings = items
      .map((item) => document.getElementById(item.id))
      .filter((heading): heading is HTMLElement => heading !== null);
    // The current section is the last heading above the top third, so jumps update it too.
    let frame = 0;
    const locate = () => {
      frame = 0;
      const line = innerHeight * 0.3;
      const passed = headings.filter((heading) => heading.getBoundingClientRect().top <= line);
      setCurrent((passed.at(-1) ?? headings[0])?.id);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(locate);
    };
    locate();
    addEventListener('scroll', schedule, { passive: true });
    return () => {
      wide.removeEventListener('change', sync);
      cancelAnimationFrame(frame);
      removeEventListener('scroll', schedule);
    };
  }, [items]);
  return (
    <details
      className="article-outline max-w-[68ch] self-start rounded-xl bg-surface px-4 py-1 text-[0.8125rem] shadow-[0_0_0_1px_var(--color-hairline)] min-[1081px]:sticky min-[1081px]:top-24 min-[1081px]:max-h-[calc(100vh-8rem)] min-[1081px]:overflow-y-auto min-[1081px]:bg-transparent min-[1081px]:p-0 min-[1081px]:shadow-none"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="flex min-h-10 cursor-pointer items-center justify-between gap-4 text-xs font-medium uppercase tracking-[0.08em] text-faint">
        On this page <span className="normal-case tracking-normal">{items.length} sections</span>
      </summary>
      <nav aria-label="On this page" className="pb-3 min-[1081px]:pb-0">
        <ol className="mt-2 mb-0 grid list-none p-0">
          {items.map((item) => (
            <li key={item.id} data-level={item.level}>
              <a
                href={`#${item.id}`}
                aria-current={item.id === current ? 'location' : undefined}
                className={`block border-l border-hairline py-1.5 leading-snug text-muted no-underline transition-colors hover:text-text aria-[current=location]:border-l-2 aria-[current=location]:border-accent aria-[current=location]:text-text ${item.level === 3 ? 'pl-7 aria-[current=location]:pl-[1.6875rem]' : 'pl-3.5 aria-[current=location]:pl-[0.8125rem]'}`}
              >
                {item.text}
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </details>
  );
}

/** A decorative 2px line; the scrollbar remains the accessible position indicator. */
export function ReadingProgress() {
  const line = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const root = document.documentElement;
      const total = root.scrollHeight - root.clientHeight;
      line.current?.style.setProperty(
        '--progress',
        String(total > 0 ? Math.min(1, root.scrollTop / total) : 0),
      );
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    addEventListener('scroll', schedule, { passive: true });
    addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener('scroll', schedule);
      removeEventListener('resize', schedule);
    };
  }, []);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5" aria-hidden="true">
      <span
        ref={line}
        className="block h-full origin-left scale-x-[var(--progress,0)] bg-accent shadow-glow"
      />
    </div>
  );
}
