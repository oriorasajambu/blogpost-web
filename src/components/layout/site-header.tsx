'use client';

import { ReadingLink as Link } from './reading-link';
import { usePathname } from 'next/navigation';
import { useRef, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { ThemeToggle } from './theme-toggle';

export type CategoryLink = { name: string; slug: string };

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
      className="site-header"
      onKeyDown={onEscape}
      onBlur={(event) => {
        if (menuOpen && !event.currentTarget.contains(event.relatedTarget)) setOpenPath(null);
      }}
    >
      <div className="container header-top">
        <Link href="/" className="brand" aria-label="Blogpost home">
          blogpost<span className="brand-dot">.</span>
        </Link>
        <span className="brand-caption">Ideas worth your time.</span>
        <nav className="header-actions" aria-label="Utility navigation">
          <Link href="/search" className="icon-button" aria-label="Search articles">
            <Icon name="search" />
          </Link>
          <ThemeToggle />
          {loginEnabled && staffSession && (
            <Link href="/studio" className="staff-link">
              Studio <Icon name="arrow" size={15} />
            </Link>
          )}
          {loginEnabled && !staffSession && (
            <Link href="/sign-in" className="staff-link">
              Staff sign in <Icon name="arrow" size={15} />
            </Link>
          )}
          <button
            ref={menuButton}
            type="button"
            className="icon-button menu-toggle"
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={menuOpen}
            aria-controls="main-navigation"
            onClick={() => setOpenPath(menuOpen ? null : pathname)}
          >
            <Icon name={menuOpen ? 'close' : 'menu'} />
          </button>
        </nav>
      </div>
      <div className={`header-navigation${menuOpen ? ' is-open' : ''}`} id="main-navigation">
        <nav
          className="container primary-nav"
          aria-label="Main navigation"
          onClick={() => setOpenPath(null)}
        >
          <Link href="/" aria-current={pathname === '/' ? 'page' : undefined}>
            Latest
          </Link>
          {categories.slice(0, 6).map((category) => (
            <Link
              key={category.slug}
              href={`/categories/${encodeURIComponent(category.slug)}`}
              aria-current={pathname === `/categories/${category.slug}` ? 'page' : undefined}
            >
              {category.name}
            </Link>
          ))}
          <Link href="/search" aria-current={pathname === '/search' ? 'page' : undefined}>
            Explore <Icon name="arrow" size={14} />
          </Link>
        </nav>
      </div>
    </header>
  );
}
