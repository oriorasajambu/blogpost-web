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
      <div className="code-header">
        <span>{label}</span>
        <button
          type="button"
          onClick={copy}
          aria-disabled={copying || undefined}
          aria-controls={`${identifier}-code`}
        >
          <Icon name={message === 'Code copied.' ? 'check' : 'copy'} size={14} />
          Copy code
        </button>
      </div>
      <pre id={`${identifier}-code`} role="region" tabIndex={0} aria-label={`${label} code`}>
        <code className={label !== 'Plain text' ? `language-${label}` : undefined}>{source}</code>
      </pre>
      <span className={message ? 'code-message' : 'sr-only'} role="status" aria-atomic="true">
        {message}
      </span>
    </div>
  );
}
