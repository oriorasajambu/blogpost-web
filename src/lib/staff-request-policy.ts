import { BffError } from './bff-error';
import { isIdentityToken } from './auth-contract';

export type StaffTransportOptions = {
  contentType?: string;
  session?: string;
  idToken?: string;
  headers?: Headers;
};

/** Never mutate request-scoped visitor context or inherit a browser credential. */
export function staffRequestHeaders(metadata: Headers, options: StaffTransportOptions = {}) {
  if (options.session && options.idToken)
    throw new BffError(400, 'INVALID_REQUEST', 'The authentication request is ambiguous.');
  const result = new Headers({ Accept: 'application/json' });
  for (const name of [
    'X-Device-ID',
    'X-Device-OS',
    'X-Device-Version',
    'X-App-Version',
    'X-App-Language',
    'traceparent',
    'tracestate',
  ]) {
    const value = metadata.get(name);
    if (value) result.set(name, value);
  }
  if (options.session) {
    if (options.session.length > 16384 || !/^[\x21-\x7e]+$/.test(options.session))
      throw new BffError(401, 'AUTHENTICATION_REQUIRED', 'Sign in again to continue.');
    result.set('X-Blogpost-Web-Session', options.session);
  }
  if (options.idToken) {
    if (!isIdentityToken(options.idToken))
      throw new BffError(400, 'INVALID_REQUEST', 'Sign in with Google again before continuing.');
    result.set('Authorization', `Bearer ${options.idToken}`);
  }
  if (options.contentType) result.set('Content-Type', options.contentType);
  for (const name of ['X-Expected-Version', 'Idempotency-Key']) {
    const value = options.headers?.get(name);
    if (value) result.set(name, value);
  }
  return result;
}
