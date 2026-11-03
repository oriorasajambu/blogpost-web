'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
export function AvailabilityRefresh() {
  const router = useRouter();
  useEffect(() => {
    let queued: ReturnType<typeof setTimeout> | undefined;
    const visible = () => {
      if (document.visibilityState !== 'visible') return;
      clearTimeout(queued);
      // Visibility and focus commonly arrive together; revalidate once for that return.
      queued = setTimeout(() => router.refresh(), 0);
    };
    const restored = (event: PageTransitionEvent) => {
      if (event.persisted) visible();
    };
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('focus', visible);
    window.addEventListener('pageshow', restored);
    return () => {
      document.removeEventListener('visibilitychange', visible);
      window.removeEventListener('focus', visible);
      window.removeEventListener('pageshow', restored);
      clearTimeout(queued);
    };
  }, [router]);
  return null;
}
