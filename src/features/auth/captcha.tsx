'use client';

import { useEffect, useRef } from 'react';

type Turnstile = {
  render: (
    element: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      'expired-callback': () => void;
      'error-callback': () => void;
    },
  ) => string;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}
const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let loading: Promise<void> | undefined;
function loadTurnstile() {
  loading ??= new Promise<void>((resolve, reject) => {
    if (window.turnstile) return resolve();
    const script = document.createElement('script');
    script.src = SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loading = undefined;
      reject(new Error('CAPTCHA_UNAVAILABLE'));
    };
    document.head.append(script);
  });
  return loading;
}

/**
 * Cloudflare Turnstile challenge. Without a configured site key nothing is rendered and the form
 * submits without a token (development and deployments that do not require one).
 */
export function Captcha({
  siteKey,
  onToken,
  resetKey,
}: {
  siteKey: string | undefined;
  onToken: (token: string | undefined) => void;
  /** Change to request a fresh challenge after a failed submit. */
  resetKey: number;
}) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!siteKey || !host.current) return;
    let widget: string | undefined;
    let cancelled = false;
    const element = host.current;
    onToken(undefined);
    loadTurnstile()
      .then(() => {
        if (cancelled || !window.turnstile) return;
        widget = window.turnstile.render(element, {
          sitekey: siteKey,
          callback: (token) => onToken(token),
          'expired-callback': () => onToken(undefined),
          'error-callback': () => onToken(undefined),
        });
      })
      .catch(() => onToken(undefined));
    return () => {
      cancelled = true;
      if (widget && window.turnstile) window.turnstile.remove(widget);
    };
  }, [siteKey, resetKey, onToken]);
  return siteKey ? <div ref={host} aria-label="Human verification" /> : null;
}
