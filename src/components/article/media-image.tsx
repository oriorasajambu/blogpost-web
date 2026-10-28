'use client';

import { useState } from 'react';

export function MediaImage({
  src,
  alt,
  width,
  height,
  loading = 'lazy',
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  loading?: 'eager' | 'lazy';
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  if (failedSource === src)
    return (
      <span className="media-unavailable">
        {alt ? `Image unavailable: ${alt}` : 'Image unavailable'}
      </span>
    );
  // Withdrawable images use the same-origin streaming route without an optimizer cache.
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={loading}
      onError={() => setFailedSource(src)}
    />
  );
}
