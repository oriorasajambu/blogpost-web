'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
export function AvailabilityRefresh() {
  const router = useRouter();
  useEffect(() => {
    const visible = () => {
      if (document.visibilityState === 'visible') router.refresh();
    };
    const restored = (event: PageTransitionEvent) => {
      if (event.persisted) router.refresh();
    };
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('pageshow', restored);
    return () => {
      document.removeEventListener('visibilitychange', visible);
      window.removeEventListener('pageshow', restored);
    };
  }, [router]);
  return null;
}
