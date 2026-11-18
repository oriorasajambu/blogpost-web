'use client';

import { useEffect, useRef, useState } from 'react';
import { auth } from '@/components/ui/styles';
import { AuthIcon } from './auth-ui';

type Turnstile = {
  render: (
    element: HTMLElement,
    options: {
      sitekey: string;
      appearance?: 'always' | 'execute' | 'interaction-only';
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
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!siteKey || !host.current) return;
    let widget: string | undefined;
    let cancelled = false;
    const element = host.current;
    onToken(undefined);
    setFailed(false);
    const fail = () => {
      onToken(undefined);
      if (!cancelled) setFailed(true);
    };
    loadTurnstile()
      .then(() => {
        if (cancelled || !window.turnstile) return;
        widget = window.turnstile.render(element, {
          sitekey: siteKey,
          // The challenge is only shown when Cloudflare needs one.
          appearance: 'interaction-only',
          callback: (token) => onToken(token),
          'expired-callback': () => onToken(undefined),
          'error-callback': fail,
        });
      })
      .catch(fail);
    return () => {
      cancelled = true;
      if (widget && window.turnstile) window.turnstile.remove(widget);
    };
  }, [siteKey, resetKey, attempt, onToken]);
  if (!siteKey) return null;
  return (
    <div className="grid gap-2">
      <div ref={host} aria-label="Human verification" />
      {failed ? (
        <p
          data-tone="danger"
          className={`${auth.notice} items-center justify-between`}
          role="status"
        >
          <span className="flex items-center gap-2">
            <AuthIcon name="alert" size={18} />
            We couldn’t verify your browser.
          </span>
          <button
            type="button"
            className="min-h-9 border-0 bg-transparent p-0 text-sm font-semibold text-current underline underline-offset-4"
            onClick={() => setAttempt((value) => value + 1)}
          >
            Retry check
          </button>
        </p>
      ) : (
        <p className={auth.slot}>
          <AuthIcon name="shield" size={14} />
          Protected by Cloudflare Turnstile. A check appears only if needed.
        </p>
      )}
    </div>
  );
}
