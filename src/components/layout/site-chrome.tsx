'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { ReadingContent } from './reading-navigation';

export const isStudioPath = (pathname: string) =>
  pathname === '/studio' || pathname.startsWith('/studio/');

/** The reader gets the public header and footer; the Studio is its own full-window app shell. */
export function SiteChrome({
  header,
  footer,
  children,
}: {
  header: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}) {
  const studio = isStudioPath(usePathname());
  return (
    <>
      {!studio && header}
      <ReadingContent wide={studio}>{children}</ReadingContent>
      {!studio && footer}
    </>
  );
}
