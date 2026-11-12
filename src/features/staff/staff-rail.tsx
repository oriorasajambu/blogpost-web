'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, type ReactNode } from 'react';
import { Icon, type IconName } from '@/components/ui/icon';
import { iconButton } from '@/components/ui/styles';
import { ThemeToggle } from '@/components/layout/theme-toggle';

const icons: Record<string, IconName> = {
  '/studio/posts': 'file',
  '/studio/review': 'tray',
  '/studio/taxonomy': 'tag',
  '/studio/trash': 'trash',
  '/studio/admin': 'users',
  '/studio/profile': 'user',
};

function Navigation({
  items,
  pathname,
}: {
  items: Array<{ href: string; label: string }>;
  pathname: string;
}) {
  return (
    <nav className="staff-navigation flex flex-col gap-0.5" aria-label="Staff navigation">
      {items.map((item) => {
        const current = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <a
            key={item.href}
            href={item.href}
            aria-current={current ? 'page' : undefined}
            className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-muted no-underline hover:transition-colors hover:bg-raised hover:text-text aria-[current=page]:bg-accent-tint aria-[current=page]:text-text aria-[current=page]:shadow-[inset_2px_0_0_var(--color-accent)] [&[aria-current=page]_svg]:text-accent-ink"
          >
            <Icon name={icons[item.href] ?? 'file'} size={18} />
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}

const foot =
  'staff-rail-foot mt-auto grid gap-3 border-t border-hairline px-1 pt-4 text-[0.8125rem] [&_.staff-exit>button]:w-full';

/**
 * The Studio's navigation: a sticky left rail from 768px, and on phones a modal drawer
 * (native <dialog>: focus trap, Escape and an inert page come from the browser).
 */
export function StaffRail({
  items,
  children,
}: {
  items: Array<{ href: string; label: string }>;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const drawer = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const currentLabel =
    items.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.label ??
    'Studio';
  useEffect(() => {
    // A link inside the drawer changes the route: close it and hand focus back.
    if (drawer.current?.open) {
      drawer.current.close();
      trigger.current?.focus();
    }
  }, [pathname]);
  useEffect(() => {
    const wide = matchMedia('(min-width: 48rem)');
    const sync = () => {
      if (wide.matches && drawer.current?.open) drawer.current.close();
    };
    wide.addEventListener('change', sync);
    return () => wide.removeEventListener('change', sync);
  }, []);
  return (
    <>
      <header className="sticky top-0 z-30 flex min-h-14 items-center gap-2 border-b border-hairline bg-bg/90 px-2 backdrop-blur-md md:hidden">
        <button
          ref={trigger}
          type="button"
          className={iconButton}
          aria-label="Open Studio navigation"
          aria-haspopup="dialog"
          onClick={() => drawer.current?.showModal()}
        >
          <Icon name="menu" />
        </button>
        <Brand />
        <span className="ml-auto truncate text-sm font-medium text-muted">{currentLabel}</span>
        <ThemeToggle />
      </header>
      <dialog
        ref={drawer}
        aria-label="Studio navigation"
        className="studio-drawer m-0 h-dvh max-h-none w-[min(20rem,calc(100%-3rem))] max-w-none border-0 bg-surface p-0 text-text shadow-lg backdrop:bg-scrim md:hidden"
        onClick={(event) => {
          // Only a click on the backdrop lands on the dialog element itself.
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
        onClose={() => trigger.current?.focus()}
      >
        <div className="flex h-full flex-col gap-5 p-3">
          <div className="flex items-center justify-between pl-2">
            <Brand />
            <button
              type="button"
              className={iconButton}
              aria-label="Close Studio navigation"
              onClick={() => drawer.current?.close()}
            >
              <Icon name="close" />
            </button>
          </div>
          <Navigation items={items} pathname={pathname} />
          <div className={foot}>{children}</div>
        </div>
      </dialog>
      <aside className="staff-rail sticky top-0 flex h-dvh w-64 shrink-0 flex-col gap-6 overflow-y-auto border-r border-hairline bg-sunk/50 px-3 pt-5 pb-4 max-md:hidden">
        <div className="flex items-center justify-between pl-3">
          <Brand />
          <ThemeToggle />
        </div>
        <Navigation items={items} pathname={pathname} />
        <div className={foot}>{children}</div>
      </aside>
    </>
  );
}

function Brand() {
  return (
    <span className="flex items-center gap-2.5">
      <Link
        href="/"
        prefetch={false}
        className="text-[1.1875rem] font-semibold tracking-[-0.02em] text-text no-underline hover:text-text"
        aria-label="Blogpost home"
      >
        blogpost<span className="text-accent">.</span>
      </Link>
      <span className="inline-flex h-5 items-center rounded-full bg-tag-bg px-2 text-[0.6875rem] font-medium text-tag-ink">
        Studio
      </span>
    </span>
  );
}
