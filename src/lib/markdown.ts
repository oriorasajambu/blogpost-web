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
