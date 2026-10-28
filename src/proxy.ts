import { NextRequest, NextResponse } from 'next/server';
import { getConfig } from './lib/config';
import { uuidPattern } from './lib/request-policy';
export function proxy(request: NextRequest) {
  const config = getConfig();
  const stored = request.cookies.get(config.installationCookie)?.value;
  const installation = stored && uuidPattern.test(stored) ? stored : crypto.randomUUID();
  const nonce = btoa(crypto.randomUUID());
  const dev = process.env.NODE_ENV === 'development';
  const csp = `default-src 'self'; script-src 'self' 'nonce-${nonce}'${dev ? " 'unsafe-eval'" : ''}; style-src 'self' 'unsafe-inline'; img-src 'self' blob:; font-src 'self'; connect-src 'self'${dev ? ' ws: wss:' : ''}; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`;
  const forwarded = new Headers(request.headers);
  forwarded.set('x-blogpost-installation', installation);
  forwarded.set('x-nonce', nonce);
  forwarded.set('content-security-policy', csp);
  const response = NextResponse.next({ request: { headers: forwarded } });
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('Cache-Control', 'no-store, max-age=0');
  if (config.environment !== 'production')
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  if (stored !== installation)
    response.cookies.set(config.installationCookie, installation, {
      httpOnly: true,
      secure: config.environment !== 'development',
      sameSite: 'lax',
      path: '/',
      maxAge: 31536000,
    });
  return response;
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|health/live).*)'] };
