'use client';

export class AuthRequestError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
  ) {
    super(code);
    this.name = 'AuthRequestError';
  }
}
export async function authJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    cache: 'no-store',
    redirect: 'error',
  });
  let value: unknown;
  try {
    value = await response.json();
  } catch {
    throw new AuthRequestError('INVALID_API_RESPONSE', response.status);
  }
  if (!response.ok) {
    const code = (value as { error?: { code?: unknown } })?.error?.code;
    throw new AuthRequestError(
      typeof code === 'string' ? code : 'AUTHENTICATION_FAILED',
      response.status,
    );
  }
  return value as T;
}
export async function freshCsrf() {
  const result = await authJson<{ token: string; expiresAt: string }>('/api/csrf');
  if (typeof result.token !== 'string' || !result.token || typeof result.expiresAt !== 'string')
    throw new AuthRequestError('INVALID_API_RESPONSE', 503);
  return result;
}
export function authMutation<T>(
  path: string,
  body: unknown,
  token: string,
  headers: Record<string, string> = {},
) {
  return authJson<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token, ...headers },
    body: JSON.stringify(body),
  });
}
