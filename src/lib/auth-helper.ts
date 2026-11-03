import 'server-only';
import { headers as requestHeaders } from 'next/headers';
import { getConfig } from './config';
import { authHelperFiles, redirectSupported } from './auth-security-policy';
import { BffError, bffErrorResponse, readLimitedBody } from './bff';

/** Transparent, fixed-origin Firebase helper delivery for same-origin OAuth storage. */
export async function authHelper(request: Request, file: string, init = false) {
  try {
    const config = getConfig();
    if (
      !config.identity ||
      !redirectSupported(config) ||
      config.authEmulatorOrigin ||
      (!init && !authHelperFiles.has(file)) ||
      (init && file !== 'init.json')
    )
      throw new BffError(404, 'RESOURCE_NOT_FOUND', 'This sign-in helper is unavailable.');
    if (init)
      return Response.json(config.identity, {
        headers: {
          'Cache-Control': 'no-store',
          'Referrer-Policy': 'no-referrer',
          'X-Robots-Tag': 'noindex, nofollow',
        },
      });
    const incoming = new URL(request.url);
    if (incoming.search.length > 16384)
      throw new BffError(414, 'INVALID_REQUEST', 'The sign-in address is too long.');
    const target =
      `https://${config.identity.projectId}.firebaseapp.com/__/` +
      (init ? 'firebase/init.json' : `auth/${file}`) +
      incoming.search;
    const headers = new Headers({ Accept: request.headers.get('accept') ?? '*/*' });
    const type = request.headers.get('content-type');
    if (type) headers.set('Content-Type', type);
    const body =
      request.method === 'POST' ? Buffer.from(await readLimitedBody(request, 65536)) : undefined;
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body,
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(10000),
    });
    if (upstream.status >= 300 && upstream.status < 400) {
      await upstream.body?.cancel();
      throw new BffError(
        502,
        'INVALID_API_RESPONSE',
        'The sign-in helper is temporarily unavailable.',
      );
    }
    const responseHeaders = new Headers({
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
      'X-Robots-Tag': 'noindex, nofollow',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
    });
    const upstreamType = upstream.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
    if (upstreamType) responseHeaders.set('Content-Type', upstreamType);
    if (
      !['text/html', 'text/javascript', 'application/javascript', 'application/json'].includes(
        upstreamType ?? '',
      )
    ) {
      await upstream.body?.cancel();
      throw new BffError(
        502,
        'INVALID_API_RESPONSE',
        'The sign-in helper is temporarily unavailable.',
      );
    }
    if (upstreamType === 'text/html') {
      const bytes = await readLimitedBody(
        new Request('http://helper.invalid', {
          method: 'POST',
          body: upstream.body,
          duplex: 'half',
        } as RequestInit),
        262144,
      );
      const nonce = (await requestHeaders()).get('x-nonce');
      if (!nonce) throw new Error('Missing script nonce.');
      // Nonces cover Firebase's trusted helper inline/external scripts without unsafe-eval.
      const html = new TextDecoder()
        .decode(bytes)
        .replace(
          /<script\b([^>]*)>/gi,
          (_match, attributes: string) =>
            `<script nonce="${nonce}"${attributes.replace(/\snonce\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')}>`,
        );
      return new Response(html, { status: upstream.status, headers: responseHeaders });
    }
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch (error) {
    return bffErrorResponse(error);
  }
}
