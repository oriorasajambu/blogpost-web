'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/icon';

export function CodeBlock({ source, language }: { source: string; language: string }) {
  const [message, setMessage] = useState('');
  async function copy() {
    try {
      await navigator.clipboard.writeText(source);
      setMessage('Copied');
    } catch {
      setMessage('Copy unavailable. Select the code to copy it.');
    }
  }
  return (
    <div className="code-block">
      <div className="code-header">
        <span>{language || 'Plain text'}</span>
        <button type="button" onClick={copy}>
          <Icon name={message === 'Copied' ? 'check' : 'copy'} size={14} />
          {message === 'Copied' ? 'Copied' : 'Copy code'}
        </button>
      </div>
      <pre tabIndex={0} aria-label={`${language || 'Plain text'} code`}>
        <code className={language ? `language-${language}` : undefined}>{source}</code>
      </pre>
      <span className="sr-only" role="status">
        {message}
      </span>
    </div>
  );
}
