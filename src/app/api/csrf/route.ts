import { cookies } from 'next/headers';
import { createCsrfToken, csrfLifetimeSeconds } from '@/lib/csrf-policy';
import { bffErrorResponse, BffError, requireLoginConfig } from '@/lib/bff';
export async function GET(request: Request) {
  try {
    const config = requireLoginConfig();
    const origin = request.headers.get('Origin');
    if (
      (origin && origin !== config.webOrigin) ||
      request.headers.get('Sec-Fetch-Site') === 'cross-site'
    )
      throw new BffError(403, 'CSRF_VALIDATION_FAILED', 'Open this page on the journal website.');
    const store = await cookies();
    const token = createCsrfToken(config.csrfSecret, store.get(config.sessionCookie)?.value);
    store.set(config.csrfCookie, token.token, {
      httpOnly: true,
      secure: config.secureCookies,
      sameSite: 'lax',
      path: '/',
      maxAge: csrfLifetimeSeconds,
    });
    return Response.json(token, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return bffErrorResponse(error);
  }
}
