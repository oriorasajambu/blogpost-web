'use client';
/* eslint-disable @next/next/no-img-element -- Withdrawable media must avoid an optimizer cache. */

import { useState } from 'react';

export function MediaImage({
  src,
  alt,
  width,
  height,
  srcSet,
  sizes,
  loading = 'lazy',
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  srcSet?: string;
  sizes?: string;
  loading?: 'eager' | 'lazy';
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const sourceKey = `${src}\u0000${srcSet ?? ''}`;
  if (failedSource === sourceKey)
    return (
      <span
        className="media-unavailable"
        role={alt ? 'img' : undefined}
        aria-label={alt ? `${alt} (image unavailable)` : undefined}
        aria-hidden={!alt || undefined}
        style={{ aspectRatio: `${width} / ${height}` }}
      >
        {alt ? `Image unavailable: ${alt}` : 'Image unavailable'}
      </span>
    );
  // Withdrawable images use the same-origin streaming route without an optimizer cache.
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      loading={loading}
      onError={() => setFailedSource(sourceKey)}
    />
  );
}
