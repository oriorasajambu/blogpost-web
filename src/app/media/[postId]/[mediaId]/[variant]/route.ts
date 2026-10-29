import { getConfig } from '@/lib/config';
import { getRequestContext } from '@/lib/request-context';
import { resourceUuidPattern } from '@/lib/request-policy';
import { forwardMediaError, ownedError } from '@/lib/api-errors';
import { validateApiDiagnostics } from '@/lib/api-response';
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
    const type = response.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase();
    if (
      response.status !== 200 ||
      !type ||
      !['image/jpeg', 'image/png', 'image/webp'].includes(type)
    ) {
      await response.body?.cancel();
      return ownedError(502, 'INVALID_API_RESPONSE', 'The image is temporarily unavailable.');
    }
    let diagnostics;
    try {
      diagnostics = validateApiDiagnostics(response.headers);
    } catch {
      await response.body?.cancel();
      return ownedError(502, 'INVALID_API_RESPONSE', 'The image is temporarily unavailable.');
    }
    const headers = new Headers({
      ...noStore,
      'Content-Type': type,
      'Content-Disposition': 'inline',
    });
    headers.set('X-Trace-ID', diagnostics.traceId);
    headers.set('X-API-Contract-Version', diagnostics.contractVersion);
    return new Response(response.body, { headers });
  } catch {
    return ownedError(503, 'DEPENDENCY_UNAVAILABLE', 'The image is temporarily unavailable.');
  }
}
