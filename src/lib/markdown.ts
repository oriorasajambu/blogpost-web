import { resourceUuidPattern } from './request-policy';
export function safeMarkdownUrl(value: string): string | undefined {
  if (!value || /[\u0000-\u0020\u007f\\]/.test(value)) return undefined;
  if (value.startsWith('#')) return value;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  try {
    const parsed = new URL(value);
    return ['https:', 'http:', 'mailto:'].includes(parsed.protocol) &&
      !parsed.username &&
      !parsed.password
      ? value
      : undefined;
  } catch {
    return undefined;
  }
}
export function mediaUrl(source: string, postId: string): string | undefined {
  const match = /^media:\/\/([0-9a-f-]+)$/.exec(source);
  return match && resourceUuidPattern.test(match[1]) && resourceUuidPattern.test(postId)
    ? `/media/${postId}/${match[1]}/w960`
    : undefined;
}

type ResponsiveMedia = {
  mediaId: string;
  variants?: ReadonlyArray<{ name: string; width: number }>;
};

/** Build same-origin image candidates from the backend's approved, actual variant widths. */
export function mediaSources(postId: string, media: ResponsiveMedia): string | undefined {
  if (!resourceUuidPattern.test(postId) || !resourceUuidPattern.test(media.mediaId))
    return undefined;
  const bounds = new Map([
    ['w480', 480],
    ['w960', 960],
    ['w1600', 1600],
  ]);
  const candidates = new Map<number, string>();
  for (const variant of media.variants ?? []) {
    const limit = bounds.get(variant.name);
    if (!limit || !Number.isInteger(variant.width) || variant.width < 1 || variant.width > limit)
      continue;
    if (!candidates.has(variant.width))
      candidates.set(variant.width, `/media/${postId}/${media.mediaId}/${variant.name}`);
  }
  return (
    [...candidates.entries()]
      .sort(([left], [right]) => left - right)
      .map(([width, path]) => `${path} ${width}w`)
      .join(', ') || undefined
  );
}
