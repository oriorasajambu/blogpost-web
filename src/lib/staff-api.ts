import 'server-only';
import { getConfig } from './config';
import { getRequestContext } from './request-context';
import { validateApiResponse } from './api-response';
import { BackendResponseError, BffError, passthroughHeaders } from './bff';
import { staffRequestHeaders } from './staff-request-policy';

export async function staffApi(
  path: string,
  options: {
    method?: string;
    body?: BodyInit;
    contentType?: string;
    session?: string;
    idToken?: string;
    headers?: Headers;
    timeout?: number;
  } = {},
) {
  if (
    !path.startsWith('/v1/') ||
    /[\\#\r\n]/.test(path) ||
    path
      .split('?')[0]
      .split('/')
      .some((segment) => ['.', '..'].includes(segment))
  )
    throw new BffError(400, 'INVALID_REQUEST', 'The staff request is invalid.');
  const headers = staffRequestHeaders(await getRequestContext(), options);
  let response: Response;
  try {
    response = await fetch(`${getConfig().backendOrigin}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body,
      redirect: 'error',
      cache: 'no-store',
      signal: AbortSignal.timeout(options.timeout ?? 10000),
    });
  } catch {
    throw new BffError(
      503,
      'DEPENDENCY_UNAVAILABLE',
      'Staff access is temporarily unavailable. Please try again shortly.',
    );
  }
  let body: Record<string, unknown>;
  try {
    const raw: unknown = await response.json();
    body = validateApiResponse(raw, response.status, response.headers);
  } catch {
    throw new BffError(
      502,
      'INVALID_API_RESPONSE',
      'Staff access is temporarily unavailable. Please try again shortly.',
    );
  }
  const output = { body, status: response.status, headers: passthroughHeaders(response.headers) };
  if (!response.ok) throw new BackendResponseError(body, response.status, output.headers);
  return output;
}
