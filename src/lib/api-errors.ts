import { validateEnvelope } from './api-contract';
export function ownedError(status: number, code: string, title: string) {
  const traceId = crypto.randomUUID().replaceAll('-', '');
  return Response.json(
    {
      timestamp: new Date().toISOString(),
      responseKey: 'ERROR',
      statusCode: status,
      traceId,
      message: { title, descriptions: title },
      data: null,
      error: { code, fieldErrors: [], context: null },
      meta: { contractVersion: '1.0.0', pagination: null, idempotency: null },
    },
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
        'X-Trace-ID': traceId,
        'X-API-Contract-Version': '1.0.0',
      },
    },
  );
}
export async function forwardMediaError(response: Response) {
  try {
    if (!response.headers.get('Content-Type')?.includes('application/json'))
      throw new Error('Non-JSON API error.');
    const body: unknown = await response.json();
    validateEnvelope(body, response.status);
    const headers = new Headers({
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    for (const name of ['X-Trace-ID', 'X-API-Contract-Version', 'Retry-After']) {
      const value = response.headers.get(name);
      if (value) headers.set(name, value);
    }
    return Response.json(body, { status: response.status, headers });
  } catch {
    return ownedError(502, 'INVALID_API_RESPONSE', 'The image is temporarily unavailable.');
  }
}
