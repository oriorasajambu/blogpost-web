'use client';

import { useId, useState } from 'react';
import { Icon } from '@/components/ui/icon';

export function CodeBlock({ source, language }: { source: string; language: string }) {
  const [message, setMessage] = useState('');
  const [copying, setCopying] = useState(false);
  const identifier = useId();
  const label = language && /^[a-z0-9_+-]{1,40}$/i.test(language) ? language : 'Plain text';
  async function copy() {
    if (copying) return;
    setCopying(true);
    setMessage('Copying code…');
    try {
      await navigator.clipboard.writeText(source);
      setMessage('Code copied.');
    } catch {
      setMessage('Copy unavailable. Select the code to copy it.');
    } finally {
      setCopying(false);
    }
  }
  return (
    <div className="code-block">
      <div className="flex min-h-10 items-center justify-between gap-4 border-b border-hairline py-0.5 pr-1.5 pl-4 text-xs text-muted">
        <span className="font-mono">{label}</span>
        <button
          type="button"
          onClick={copy}
          aria-disabled={copying || undefined}
          aria-controls={`${identifier}-code`}
          className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-md border-0 bg-transparent px-2.5 text-[0.8125rem] font-medium text-accent-ink transition-colors hover:bg-accent-tint"
        >
          <Icon name={message === 'Code copied.' ? 'check' : 'copy'} size={14} />
          Copy code
        </button>
      </div>
      <pre id={`${identifier}-code`} role="region" tabIndex={0} aria-label={`${label} code`}>
        <code className={label !== 'Plain text' ? `language-${label}` : undefined}>{source}</code>
      </pre>
      <span
        className={
          message
            ? 'block border-t border-hairline px-4 py-2.5 text-[0.8125rem] leading-normal text-muted [overflow-wrap:anywhere]'
            : 'sr-only'
        }
        role="status"
        aria-atomic="true"
      >
        {message}
      </span>
    </div>
  );
}
