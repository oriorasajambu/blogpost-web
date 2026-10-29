'use client';

import Link, { useLinkStatus } from 'next/link';
import { useEffect, useId, type ComponentProps } from 'react';
import { useReadingNavigation } from './reading-navigation';

function PendingLink() {
  const { pending } = useLinkStatus();
  const { update } = useReadingNavigation();
  const id = useId();
  useEffect(() => {
    update(id, pending);
    return () => update(id, false);
  }, [id, pending, update]);
  return null;
}

export function ReadingLink({ children, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link prefetch={false} {...props}>
      {children}
      <PendingLink />
    </Link>
  );
}
