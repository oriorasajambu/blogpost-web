'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, type ReactNode } from 'react';
import { Icon, type IconName } from '@/components/ui/icon';
import { iconButton } from '@/components/ui/styles';

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
  'staff-rail-foot mt-auto grid gap-3 border-t border-hairline pt-4 text-[0.8125rem] [&_button]:w-full';

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
      <div className="flex min-h-12 items-center gap-2 rounded-xl bg-surface pr-3 shadow-[0_0_0_1px_var(--color-hairline)] md:hidden">
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
        <span className="truncate text-sm font-medium">{currentLabel}</span>
      </div>
      <dialog
        ref={drawer}
        aria-label="Studio navigation"
        className="studio-drawer m-0 h-dvh max-h-none w-[min(20rem,calc(100%-3rem))] max-w-none flex-col gap-5 border-0 bg-surface p-3 text-text shadow-lg backdrop:bg-scrim open:flex md:hidden"
        onClick={(event) => {
          // A click on the backdrop lands on the dialog element itself.
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
        onClose={() => trigger.current?.focus()}
      >
        <div className="flex items-center justify-between pl-3">
          <span className="text-xs font-medium uppercase tracking-[0.08em] text-faint">Studio</span>
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
      </dialog>
      <aside className="staff-rail sticky top-[7.5rem] flex w-60 shrink-0 flex-col gap-6 self-start rounded-xl bg-surface/50 p-3 shadow-[0_0_0_1px_var(--color-hairline)] max-md:hidden">
        <Navigation items={items} pathname={pathname} />
        <div className={foot}>{children}</div>
      </aside>
    </>
  );
}
