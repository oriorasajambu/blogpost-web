import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const csrfLifetimeSeconds = 15 * 60;
function mac(value: string, secret: string) {
  return createHmac('sha256', secret).update(value).digest('base64url');
}
function equal(left: string, right: string) {
  const a = Buffer.from(left),
    b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
function binding(secret: string, session?: string) {
  return mac(JSON.stringify(['blogpost.csrf.session.v1', session ?? null]), secret);
}
export function createCsrfToken(secret: string, session?: string, now = Date.now()) {
  const expiresAt = Math.floor(now / 1000) + csrfLifetimeSeconds;
  const payload = Buffer.from(
    JSON.stringify({
      v: 1,
      exp: expiresAt,
      nonce: randomBytes(24).toString('base64url'),
      binding: binding(secret, session),
    }),
  ).toString('base64url');
  return {
    token: `${payload}.${mac(payload, secret)}`,
    expiresAt: new Date(expiresAt * 1000).toISOString(),
  };
}
export function verifyCsrfToken(
  token: string,
  cookie: string | undefined,
  secret: string,
  session?: string,
  now = Date.now(),
) {
  if (!cookie || token.length > 1024 || !equal(token, cookie)) return false;
  const parts = token.split('.');
  if (
    parts.length !== 2 ||
    !/^[A-Za-z0-9_-]+$/.test(parts[0]) ||
    !equal(parts[1], mac(parts[0], secret))
  )
    return false;
  try {
    const payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    const seconds = Math.floor(now / 1000);
    return (
      payload.v === 1 &&
      Number.isInteger(payload.exp) &&
      payload.exp > seconds &&
      payload.exp <= seconds + csrfLifetimeSeconds &&
      typeof payload.nonce === 'string' &&
      /^[A-Za-z0-9_-]{32}$/.test(payload.nonce) &&
      typeof payload.binding === 'string' &&
      equal(payload.binding, binding(secret, session))
    );
  } catch {
    return false;
  }
}
export function isSameOriginMutation(headers: Headers, origin: string) {
  const incoming = headers.get('Origin');
  return (
    incoming === origin && !['cross-site', 'none'].includes(headers.get('Sec-Fetch-Site') ?? '')
  );
}
