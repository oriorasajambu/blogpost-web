import { NextRequest, NextResponse } from 'next/server';
import { getConfig } from './lib/config';
import { uuidPattern } from './lib/request-policy';
import { contentSecurityPolicy } from './lib/auth-security-policy';
export function proxy(request: NextRequest) {
  const config = getConfig();
  const stored = request.cookies.get(config.installationCookie)?.value;
  const installation = stored && uuidPattern.test(stored) ? stored : crypto.randomUUID();
  const nonce = btoa(crypto.randomUUID());
  const dev = process.env.NODE_ENV === 'development';
  const csp = contentSecurityPolicy(config, request.nextUrl.pathname, nonce, dev);
  const forwarded = new Headers(request.headers);
  forwarded.set('x-blogpost-installation', installation);
  forwarded.set('x-nonce', nonce);
  forwarded.set('content-security-policy', csp);
  const response = NextResponse.next({ request: { headers: forwarded } });
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('Cache-Control', 'no-store, max-age=0');
  const staff = /^\/(?:studio|sign-in|invite|invitations|api)(?:\/|$)/.test(
    request.nextUrl.pathname,
  );
  const helper = request.nextUrl.pathname.startsWith('/__/auth/');
  if (staff || helper) {
    response.headers.set('Referrer-Policy', 'no-referrer');
    response.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  }
  if (helper) response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  if (config.environment !== 'production' || staff || helper)
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  if (stored !== installation)
    response.cookies.set(config.installationCookie, installation, {
      httpOnly: true,
      secure: config.secureCookies,
      sameSite: 'lax',
      path: '/',
      maxAge: 31536000,
    });
  return response;
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|health/live).*)'] };
