import { validateApiResponse } from '@/lib/api-response';
import type { components } from '@/lib/api-types';
import { validateCursorPagination } from '@/features/editor/editor-contract';

export type StaffPagination =
  components['schemas']['CursorPagination'] | components['schemas']['PagePagination'];
export type StaffResult<T> = {
  data: T;
  version: number | null;
  pagination: StaffPagination | null;
  idempotency: { replayed: boolean; expiresAt: string } | null;
  traceId: string;
};
export type StaffRequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  content?: unknown;
  key?: string;
  version?: number;
};
export class StaffApiError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    public readonly traceId?: string,
    public readonly details?: unknown,
    public readonly retryAfter?: string,
  ) {
    super(code);
    this.name = 'StaffApiError';
  }
}
export function notifyStaffAccess(error: unknown) {
  if (typeof window === 'undefined' || typeof error !== 'object' || !error) return;
  const value = error as { status?: unknown; code?: unknown };
  if (value.status === 401) window.dispatchEvent(new Event('blogpost:staff-session-expired'));
  if (value.status === 403 && value.code !== 'CSRF_VALIDATION_FAILED')
    window.dispatchEvent(new Event('blogpost:staff-access-lost'));
}
export function validateStaffPagination(value: unknown): StaffPagination | null {
  if (value === null) return null;
  if (typeof value !== 'object' || !value) throw new Error('Invalid pagination');
  const v = value as Record<string, unknown>;
  if (v.kind === 'CURSOR') return validateCursorPagination(v);
  if (
    v.kind !== 'PAGE' ||
    !Number.isSafeInteger(v.page) ||
    Number(v.page) < 1 ||
    !Number.isSafeInteger(v.pageSize) ||
    Number(v.pageSize) < 1 ||
    Number(v.pageSize) > 50 ||
    !Number.isSafeInteger(v.totalItems) ||
    Number(v.totalItems) < 0 ||
    !Number.isSafeInteger(v.totalPages) ||
    Number(v.totalPages) < 0 ||
    typeof v.hasMore !== 'boolean' ||
    typeof v.truncated !== 'boolean' ||
    v.hasMore !== Number(v.page) < Number(v.totalPages)
  )
    throw new Error('Invalid pagination');
  return {
    kind: 'PAGE',
    page: Number(v.page),
    pageSize: Number(v.pageSize),
    totalItems: Number(v.totalItems),
    totalPages: Number(v.totalPages),
    hasMore: v.hasMore,
    truncated: v.truncated,
  };
}
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

/** JSON-only staff transport. The BFF independently checks paths, roles, session and CSRF. */
export function createStaffRequest(fetcher: typeof fetch = fetch) {
  // Leave capacity for session checks and private media beside parallel staff panels.
  let activeRequests = 0;
  const waiting: Array<() => void> = [];
  const limitedFetch: typeof fetch = async (input, init) => {
    if (activeRequests < 2) activeRequests++;
    else await new Promise<void>((resolve) => waiting.push(resolve));
    try {
      return await fetcher(input, init);
    } finally {
      const next = waiting.shift();
      if (next)
        next(); // Transfer the occupied slot before another caller can claim it.
      else activeRequests--;
    }
  };
  async function read(response: Response) {
    try {
      const envelope = validateApiResponse(
        await response.json(),
        response.status,
        response.headers,
      );
      if (!response.ok) {
        const error = envelope.error as { code: string; fieldErrors: unknown; context: unknown };
        notifyStaffAccess({ status: response.status, code: error.code });
        throw new StaffApiError(
          error.code,
          response.status,
          String(envelope.traceId),
          { fieldErrors: error.fieldErrors, context: error.context },
          response.headers.get('Retry-After') ?? undefined,
        );
      }
      return envelope;
    } catch (error) {
      if (error instanceof StaffApiError) throw error;
      throw new StaffApiError('INVALID_API_RESPONSE', 502);
    }
  }
  return async function request<T>(
    path: string,
    validate: (value: unknown) => T,
    options: StaffRequestOptions = {},
  ): Promise<StaffResult<T>> {
    if (
      !/^\/(?:me|posts|categories|tags|admin)(?:[/?]|$)/.test(path) ||
      /[\\#\r\n]/.test(path) ||
      path.includes('..') ||
      path.startsWith('//')
    )
      throw new StaffApiError('INVALID_REQUEST', 400);
    const method = options.method ?? 'GET';
    const headers = new Headers({ Accept: 'application/json' });
    let body: string | undefined;
    if (method !== 'GET') {
      if (!options.key || !uuid.test(options.key)) throw new StaffApiError('INVALID_REQUEST', 400);
      if (
        options.version !== undefined &&
        (!Number.isSafeInteger(options.version) ||
          options.version < 1 ||
          options.version > 2147483647)
      )
        throw new StaffApiError('INVALID_REQUEST', 400);
      let csrf: Response;
      try {
        csrf = await limitedFetch('/api/csrf', {
          credentials: 'same-origin',
          cache: 'no-store',
          redirect: 'error',
          signal: AbortSignal.timeout(15_000),
        });
      } catch {
        throw new StaffApiError('DEPENDENCY_UNAVAILABLE', 503);
      }
      if (!csrf.ok) await read(csrf);
      let token: unknown;
      try {
        const value = await csrf.json();
        if (
          typeof value.token !== 'string' ||
          !value.token ||
          value.token.length > 1024 ||
          typeof value.expiresAt !== 'string' ||
          Date.parse(value.expiresAt) <= Date.now() ||
          !Number.isFinite(Date.parse(value.expiresAt))
        )
          throw new Error();
        token = value.token;
      } catch {
        throw new StaffApiError('INVALID_API_RESPONSE', 502);
      }
      headers.set('X-CSRF-Token', String(token));
      headers.set('Idempotency-Key', options.key);
      if (options.version !== undefined) headers.set('X-Expected-Version', String(options.version));
      headers.set('Content-Type', 'application/json');
      if (options.content !== undefined) body = JSON.stringify(options.content);
    }
    let response: Response;
    try {
      response = await limitedFetch(`/api/editorial${path}`, {
        method,
        headers,
        body,
        credentials: 'same-origin',
        cache: 'no-store',
        redirect: 'error',
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new StaffApiError(method === 'GET' ? 'DEPENDENCY_UNAVAILABLE' : 'OUTCOME_UNKNOWN', 0);
    }
    const envelope = await read(response);
    try {
      const meta = envelope.meta as {
        pagination: unknown;
        idempotency: StaffResult<T>['idempotency'];
      };
      if (method !== 'GET' && !meta.idempotency) throw new Error();
      const data = validate(envelope.data);
      const rawVersion = response.headers.get('X-Resource-Version');
      const version = rawVersion === null ? null : Number(rawVersion);
      if (
        rawVersion !== null &&
        (!/^[1-9]\d{0,9}$/.test(rawVersion) ||
          !Number.isSafeInteger(version) ||
          Number(version) > 2147483647)
      )
        throw new Error();
      if (
        typeof data === 'object' &&
        data !== null &&
        'version' in data &&
        (data as { version: unknown }).version !== version
      )
        throw new Error();
      if (typeof data === 'object' && data !== null && 'invitation' in data) {
        const invitation = (data as { invitation: unknown }).invitation;
        if (
          typeof invitation === 'object' &&
          invitation !== null &&
          'version' in invitation &&
          (invitation as { version: unknown }).version !== version
        )
          throw new Error();
      }
      return {
        data,
        version,
        pagination: validateStaffPagination(meta.pagination),
        idempotency: meta.idempotency,
        traceId: String(envelope.traceId),
      };
    } catch {
      throw new StaffApiError('INVALID_API_RESPONSE', 502, String(envelope.traceId));
    }
  };
}
export const staffRequest = createStaffRequest();
