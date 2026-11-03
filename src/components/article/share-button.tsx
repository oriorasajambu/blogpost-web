'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/icon';

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
    <div className="share-control">
      <button
        type="button"
        className="button-secondary"
        onClick={share}
        aria-label={`Copy link to ${title}`}
      >
        <Icon name={message === 'Link copied' ? 'check' : 'copy'} size={16} />
        Share story
      </button>
      <span className="share-message" role="status">
        {message}
      </span>
    </div>
  );
}
