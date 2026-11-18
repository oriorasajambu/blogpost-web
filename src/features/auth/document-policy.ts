'use client';

import { useEffect } from 'react';
import { needsAuthDocument } from '@/lib/auth-security-policy';

const RELOAD_KEY = 'blogpost:auth-document-reload';

/**
 * Auth screens need the content security policy that only a full page load of an auth screen carries.
 * Reached by a client-side navigation (a header link, or a server redirect from the Studio), the page
 * keeps the policy of the document it came from and every identity request fails as "could not connect".
 * Load the current address afresh once; the stored address stops a reload loop.
 */
export function useAuthDocumentPolicy() {
  useEffect(() => {
    const entry = performance.getEntriesByType('navigation')[0] as
      PerformanceNavigationTiming | undefined;
    if (!entry) return;
    let loaded: string;
    try {
      loaded = new URL(entry.name).pathname;
    } catch {
      return;
    }
    if (!needsAuthDocument(loaded)) return;
    try {
      if (sessionStorage.getItem(RELOAD_KEY) === window.location.href) return;
      sessionStorage.setItem(RELOAD_KEY, window.location.href);
    } catch {
      return;
    }
    window.location.replace(window.location.href);
  }, []);
}
