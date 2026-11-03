'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/ui/icon';

const icons: Record<string, IconName> = {
  '/studio/posts': 'file',
  '/studio/review': 'tray',
  '/studio/taxonomy': 'tag',
  '/studio/trash': 'trash',
  '/studio/admin': 'users',
  '/studio/profile': 'user',
};

/** The Studio's left rail: workspaces first, the signed-in identity and sign-out at its foot. */
export function StaffRail({
  items,
  children,
}: {
  items: Array<{ href: string; label: string }>;
  children: ReactNode;
}) {
  const pathname = usePathname();
  return (
    <aside className="staff-rail">
      <nav className="staff-navigation" aria-label="Staff navigation">
        {items.map((item) => {
          const current = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <a key={item.href} href={item.href} aria-current={current ? 'page' : undefined}>
              <Icon name={icons[item.href] ?? 'file'} size={18} />
              {item.label}
            </a>
          );
        })}
      </nav>
      <div className="staff-rail-foot">{children}</div>
    </aside>
  );
}
