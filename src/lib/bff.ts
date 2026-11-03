import 'server-only';
import { cookies } from 'next/headers';
import { getConfig } from './config';
import { ownedError } from './api-errors';
import { isSameOriginMutation, verifyCsrfToken } from './csrf-policy';
import { ApiError } from './api-server';

import { BffError } from './bff-error';
export { BffError } from './bff-error';
export { readLimitedBody, readJsonBody } from './request-body';
export class BackendResponseError extends Error {
  constructor(
    public readonly body: unknown,
    public readonly status: number,
    public readonly headers: Headers,
  ) {
    super('The backend rejected the request.');
    this.name = 'BackendResponseError';
  }
}
export function requireLoginConfig() {
  const config = getConfig();
  if (!config.loginEnabled || !config.webOrigin || !config.csrfSecret || !config.identity)
    throw new BffError(404, 'RESOURCE_NOT_FOUND', 'Staff access is not enabled.');
  return {
    ...config,
    webOrigin: config.webOrigin,
    csrfSecret: config.csrfSecret,
    identity: config.identity,
  };
}
export async function validateMutation(request: Request, contentType = 'application/json') {
  const config = requireLoginConfig();
  if (!isSameOriginMutation(request.headers, config.webOrigin))
    throw new BffError(403, 'CSRF_VALIDATION_FAILED', 'Refresh this page before trying again.');
  const type = request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase();
  if (type !== contentType)
    throw new BffError(
      415,
      'UNSUPPORTED_MEDIA_TYPE',
      'This request has an unsupported content type.',
    );
  const store = await cookies();
  const token = request.headers.get('X-CSRF-Token') ?? '';
  if (
    !verifyCsrfToken(
      token,
      store.get(config.csrfCookie)?.value,
      config.csrfSecret,
      store.get(config.sessionCookie)?.value,
    )
  )
    throw new BffError(403, 'CSRF_VALIDATION_FAILED', 'Refresh this page before trying again.');
  return config;
}
export function passthroughHeaders(source: Headers) {
  const result = new Headers({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  for (const name of [
    'X-Trace-ID',
    'X-API-Contract-Version',
    'X-Resource-Version',
    'Retry-After',
  ]) {
    const value = source.get(name);
    if (value) result.set(name, value);
  }
  const location = source.get('Location');
  if (location && /^\/v1\/[A-Za-z0-9/_-]+$/.test(location)) result.set('Location', location);
  return result;
}
export function bffErrorResponse(error: unknown) {
  if (error instanceof BackendResponseError)
    return Response.json(error.body, { status: error.status, headers: error.headers });
  if (error instanceof BffError) return ownedError(error.status, error.code, error.message);
  if (error instanceof ApiError) return ownedError(error.status, error.code, error.message);
  return ownedError(
    503,
    'DEPENDENCY_UNAVAILABLE',
    'Staff access is temporarily unavailable. Please try again shortly.',
  );
}
