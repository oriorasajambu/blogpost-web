'use client';

import { useEffect, useRef, useState } from 'react';
import type { OutlineItem } from '@/lib/article-reading';

/** Section links with the reader's current section marked; a disclosure on narrow screens. */
export function ArticleOutline({ items }: { items: OutlineItem[] }) {
  const [current, setCurrent] = useState(items[0]?.id);
  const [open, setOpen] = useState(true);
  useEffect(() => {
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
      className="article-outline"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>
        On this page <span>{items.length} sections</span>
      </summary>
      <nav aria-label="On this page">
        <ol>
          {items.map((item) => (
            <li key={item.id} data-level={item.level}>
              <a href={`#${item.id}`} aria-current={item.id === current ? 'location' : undefined}>
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
    <div className="reading-progress" aria-hidden="true">
      <span ref={line} />
    </div>
  );
}
