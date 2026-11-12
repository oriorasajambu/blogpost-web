'use client';

import { ReadingLink as Link } from './reading-link';
import { usePathname } from 'next/navigation';
import { useRef, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { buttonSecondary, container, iconButton } from '@/components/ui/styles';
import { ThemeToggle } from './theme-toggle';

export type CategoryLink = { name: string; slug: string };

const navLink =
  'relative inline-flex min-h-11 max-w-full lg:min-h-16 lg:max-w-[14rem] items-center gap-1.5 truncate px-3 text-sm text-muted no-underline hover:transition-colors hover:text-text aria-[current=page]:text-text max-lg:min-h-12 max-lg:w-full max-lg:px-4 max-lg:text-base lg:after:absolute lg:after:inset-x-3 lg:after:bottom-0 lg:after:h-0.5 lg:after:rounded-full lg:aria-[current=page]:after:bg-accent max-lg:aria-[current=page]:text-accent-ink max-lg:aria-[current=page]:shadow-[inset_2px_0_0_var(--color-accent)]';

export function SiteHeader({
  categories = [],
  loginEnabled = false,
  staffSession = false,
}: {
  categories?: CategoryLink[];
  loginEnabled?: boolean;
  staffSession?: boolean;
}) {
  const pathname = usePathname();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const menuOpen = openPath === pathname;
  const menuButton = useRef<HTMLButtonElement>(null);
  function onEscape(event: React.KeyboardEvent) {
    if (event.key === 'Escape' && menuOpen) {
      event.preventDefault();
      setOpenPath(null);
      menuButton.current?.focus();
    }
  }
  return (
    <header
      className="sticky top-0 z-40 border-b border-hairline bg-bg/85 backdrop-blur-md"
      onKeyDown={onEscape}
      onBlur={(event) => {
        if (menuOpen && !event.currentTarget.contains(event.relatedTarget)) setOpenPath(null);
      }}
    >
      <div className={`${container} flex min-h-16 items-center gap-3 lg:gap-8`}>
        <Link
          href="/"
          className="shrink-0 text-[1.1875rem] font-semibold tracking-[-0.02em] text-text no-underline hover:text-text"
          aria-label="Blogpost home"
        >
          blogpost<span className="text-accent">.</span>
        </Link>
        <nav
          className="ml-auto flex shrink-0 items-center gap-1 lg:order-last"
          aria-label="Utility navigation"
        >
          <Link href="/search" className={iconButton} aria-label="Search articles">
            <Icon name="search" />
          </Link>
          <ThemeToggle />
          {loginEnabled && staffSession && (
            <Link href="/studio" className={`${buttonSecondary} ml-2 min-h-9 px-3 max-lg:hidden`}>
              Studio <Icon name="arrow" size={15} />
            </Link>
          )}
          {loginEnabled && !staffSession && (
            <Link href="/sign-in" className={`${buttonSecondary} ml-2 min-h-9 px-3 max-lg:hidden`}>
              Staff sign in <Icon name="arrow" size={15} />
            </Link>
          )}
          <button
            ref={menuButton}
            type="button"
            className={`${iconButton} lg:hidden`}
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={menuOpen}
            aria-controls="main-navigation"
            onClick={() => setOpenPath(menuOpen ? null : pathname)}
          >
            <Icon name={menuOpen ? 'close' : 'menu'} />
          </button>
        </nav>
        {/* One row from 1024px: brand, sections, then utilities (CSS order); narrower screens use the menu panel so long sections never stack inside the sticky header. The panel follows its
            menu button in the document so keyboard focus moves into it on phones. */}
        <div
          id="main-navigation"
          className={`min-w-0 flex-1 max-lg:absolute max-lg:inset-x-0 max-lg:top-full max-lg:border-y max-lg:border-hairline max-lg:bg-surface max-lg:shadow-md ${menuOpen ? 'max-lg:block' : 'max-lg:hidden'}`}
        >
          <nav
            className="primary-nav flex flex-wrap items-stretch max-lg:flex-col max-lg:py-2 lg:gap-x-1"
            aria-label="Main navigation"
            onClick={() => setOpenPath(null)}
          >
            <Link href="/" className={navLink} aria-current={pathname === '/' ? 'page' : undefined}>
              Latest
            </Link>
            {categories.slice(0, 6).map((category) => (
              <Link
                key={category.slug}
                href={`/categories/${encodeURIComponent(category.slug)}`}
                className={navLink}
                aria-current={pathname === `/categories/${category.slug}` ? 'page' : undefined}
              >
                <span className="truncate">{category.name}</span>
              </Link>
            ))}
            <Link
              href="/search"
              className={navLink}
              aria-current={pathname === '/search' ? 'page' : undefined}
            >
              Explore <Icon name="arrow" size={14} />
            </Link>
            {loginEnabled && (
              <Link href={staffSession ? '/studio' : '/sign-in'} className={`${navLink} lg:hidden`}>
                {staffSession ? 'Studio' : 'Staff sign in'} <Icon name="arrow" size={14} />
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
