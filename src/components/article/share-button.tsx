'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { buttonSecondary } from '@/components/ui/styles';

export function ShareButton({ title }: { title: string }) {
  const [message, setMessage] = useState('');
  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setMessage('Link copied');
    } catch {
      setMessage('Copy the article address from your browser to share it.');
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        className={`${buttonSecondary} min-h-9 px-3 max-sm:whitespace-normal`}
        onClick={share}
        aria-label={`Copy link to ${title}`}
      >
        <Icon name={message === 'Link copied' ? 'check' : 'share'} size={16} />
        Share story
      </button>
      <span className="text-[0.8125rem] text-muted" role="status">
        {message}
      </span>
    </div>
  );
}
