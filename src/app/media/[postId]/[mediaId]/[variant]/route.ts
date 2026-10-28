import { getConfig } from '@/lib/config';
import { getRequestContext } from '@/lib/request-context';
import { resourceUuidPattern } from '@/lib/request-policy';
import { forwardMediaError, ownedError } from '@/lib/api-errors';
const noStore = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ postId: string; mediaId: string; variant: string }> },
) {
  const { postId, mediaId, variant } = await params;
  if (
    !resourceUuidPattern.test(postId) ||
    !resourceUuidPattern.test(mediaId) ||
    !['w480', 'w960', 'w1600'].includes(variant)
  )
    return ownedError(404, 'RESOURCE_NOT_FOUND', 'The image is unavailable.');
  try {
    const response = await fetch(
      `${getConfig().backendOrigin}/v1/public/posts/${postId}/media/${mediaId}/${variant}`,
      {
        headers: await getRequestContext(),
        cache: 'no-store',
        redirect: 'error',
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!response.ok) return forwardMediaError(response);
    const type = response.headers.get('Content-Type')?.split(';')[0];
    if (!type || !['image/jpeg', 'image/png', 'image/webp'].includes(type))
      return ownedError(502, 'INVALID_API_RESPONSE', 'The image is temporarily unavailable.');
    const headers = new Headers({
      ...noStore,
      'Content-Type': type,
      'Content-Disposition': 'inline',
    });
    for (const name of ['X-Trace-ID', 'X-API-Contract-Version']) {
      const value = response.headers.get(name);
      if (value) headers.set(name, value);
    }
    return new Response(response.body, { headers });
  } catch {
    return ownedError(503, 'DEPENDENCY_UNAVAILABLE', 'The image is temporarily unavailable.');
  }
}
