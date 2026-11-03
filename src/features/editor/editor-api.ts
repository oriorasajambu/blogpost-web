import { validateApiResponse } from '@/lib/api-response';
import { validateApiDiagnostics } from '@/lib/api-response';
import {
  validateCursorPagination,
  validateEditorConfiguration,
  validateMediaAsset,
  validateWorkspacePost,
  validateWorkspaceSummary,
  type CursorPagination,
  type DraftContent,
  type EditorConfiguration,
  type MediaAsset,
  type WorkspacePost,
  type WorkspacePostSummary,
} from './editor-contract';

export class EditorApiError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    public readonly traceId?: string,
    public readonly retryAfter?: string,
    public readonly details?: unknown,
  ) {
    super(code);
    this.name = 'EditorApiError';
  }
}
export type EditorResult<T> = {
  data: T;
  version: number | null;
  idempotency: { replayed: boolean; expiresAt: string } | null;
};
export type EditorApi = {
  getConfig: () => Promise<EditorConfiguration>;
  getPost: (postId: string) => Promise<EditorResult<WorkspacePost>>;
  lookup: (clientDraftId: string) => Promise<EditorResult<WorkspacePost>>;
  list: (cursor?: string) => Promise<{
    data: WorkspacePostSummary[];
    pagination: CursorPagination;
  }>;
  create: (
    clientDraftId: string,
    content: DraftContent,
    key: string,
  ) => Promise<EditorResult<WorkspacePost>>;
  save: (
    postId: string,
    content: DraftContent,
    version: number,
    key: string,
  ) => Promise<EditorResult<WorkspacePost>>;
  upload: (
    postId: string,
    file: Blob,
    name: string,
    key: string,
  ) => Promise<EditorResult<MediaAsset>>;
  media: (postId: string, mediaId: string) => Promise<EditorResult<MediaAsset>>;
  download: (postId: string, mediaId: string) => Promise<Blob>;
  workflow: (
    postId: string,
    action: 'submit' | 'withdraw-review',
    version: number,
    key: string,
    revisionId?: string | null,
  ) => Promise<EditorResult<WorkspacePost>>;
};
const resourceId = (value: string) => {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value))
    throw new EditorApiError('INVALID_REQUEST', 400);
  return value;
};
function workspaceFor(value: unknown, expected: { id?: string; clientDraftId?: string }) {
  const post = validateWorkspacePost(value);
  if (
    (expected.id && post.id !== expected.id) ||
    (expected.clientDraftId && post.clientDraftId !== expected.clientDraftId)
  )
    throw new EditorApiError('INVALID_API_RESPONSE', 502);
  return post;
}
async function readResponse(response: Response) {
  try {
    const envelope = validateApiResponse(await response.json(), response.status, response.headers);
    if (!response.ok) {
      const error = envelope.error as { code: string; fieldErrors: unknown; context: unknown };
      throw new EditorApiError(
        error.code,
        response.status,
        String(envelope.traceId),
        response.headers.get('Retry-After') ?? undefined,
        { fieldErrors: error.fieldErrors, context: error.context },
      );
    }
    return envelope;
  } catch (error) {
    if (error instanceof EditorApiError) throw error;
    throw new EditorApiError('INVALID_API_RESPONSE', 502);
  }
}

/** Credentials stay in the HttpOnly session; every URL below is constructed locally. */
export function createEditorApi(fetcher: typeof fetch = fetch): EditorApi {
  async function csrfToken() {
    let response: Response;
    try {
      response = await fetcher('/api/csrf', {
        credentials: 'same-origin',
        cache: 'no-store',
        redirect: 'error',
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new EditorApiError('DEPENDENCY_UNAVAILABLE', 503);
    }
    if (!response.ok) {
      await readResponse(response);
      throw new EditorApiError('INVALID_API_RESPONSE', 502);
    }
    try {
      const body = await response.json();
      if (
        typeof body.token !== 'string' ||
        body.token.length > 1024 ||
        !body.token ||
        typeof body.expiresAt !== 'string' ||
        !Number.isFinite(Date.parse(body.expiresAt))
      )
        throw new Error();
      return body.token as string;
    } catch {
      throw new EditorApiError('INVALID_API_RESPONSE', 502);
    }
  }
  async function request<T>(
    path: string,
    validate: (value: unknown) => T,
    options: {
      method?: string;
      content?:
        | DraftContent
        | { clientDraftId: string; draft: DraftContent }
        | { revisionId: string }
        | Record<string, never>;
      file?: Blob;
      name?: string;
      key?: string;
      version?: number;
    } = {},
  ): Promise<EditorResult<T>> {
    const headers = new Headers({ Accept: 'application/json' });
    let body: BodyInit | undefined;
    if (options.method && options.method !== 'GET') {
      headers.set('X-CSRF-Token', await csrfToken());
      if (
        !options.key ||
        !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(options.key)
      )
        throw new EditorApiError('INVALID_REQUEST', 400);
      headers.set('Idempotency-Key', options.key);
      if (options.version !== undefined) {
        if (
          !Number.isInteger(options.version) ||
          options.version < 1 ||
          options.version > 2147483647
        )
          throw new EditorApiError('INVALID_REQUEST', 400);
        headers.set('X-Expected-Version', String(options.version));
      }
      if (options.file) {
        if (!options.file.size || options.file.size > 5 * 1024 * 1024)
          throw new EditorApiError('UPLOAD_TOO_LARGE', 413);
        const form = new FormData();
        form.set('file', options.file, options.name || 'image');
        body = form;
      } else if (options.content !== undefined) {
        headers.set('Content-Type', 'application/json');
        body = JSON.stringify(options.content);
      } else headers.set('Content-Type', 'application/json');
    }
    let response: Response;
    try {
      response = await fetcher(`/api/editorial${path}`, {
        method: options.method ?? 'GET',
        headers,
        body,
        credentials: 'same-origin',
        cache: 'no-store',
        redirect: 'error',
        signal: AbortSignal.timeout(options.file ? 45_000 : 15_000),
      });
    } catch {
      // The server may have committed. The durable operation retains its exact key/input.
      throw new EditorApiError('OUTCOME_UNKNOWN', 0);
    }
    const envelope = await readResponse(response);
    const metadata = envelope.meta as { idempotency: EditorResult<T>['idempotency'] };
    if (options.method && options.method !== 'GET' && !metadata.idempotency)
      throw new EditorApiError('INVALID_API_RESPONSE', 502);
    let data: T;
    try {
      data = validate(envelope.data);
    } catch {
      throw new EditorApiError('INVALID_API_RESPONSE', 502);
    }
    const rawVersion = response.headers.get('X-Resource-Version');
    const version = rawVersion === null ? null : Number(rawVersion);
    if (
      rawVersion !== null &&
      (!/^[1-9]\d{0,9}$/.test(rawVersion) ||
        !Number.isInteger(version) ||
        Number(version) > 2147483647)
    )
      throw new EditorApiError('INVALID_API_RESPONSE', 502);
    if (
      typeof data === 'object' &&
      data !== null &&
      'version' in data &&
      (data as { version: unknown }).version !== version
    )
      throw new EditorApiError('INVALID_API_RESPONSE', 502);
    return { data, version, idempotency: metadata.idempotency };
  }
  return {
    async getConfig() {
      let response: Response;
      try {
        response = await fetcher('/api/editor-config', {
          credentials: 'same-origin',
          cache: 'no-store',
          redirect: 'error',
          signal: AbortSignal.timeout(15_000),
        });
      } catch {
        throw new EditorApiError('DEPENDENCY_UNAVAILABLE', 503);
      }
      if (!response.ok) {
        await readResponse(response);
        throw new EditorApiError('INVALID_API_RESPONSE', 502);
      }
      try {
        return validateEditorConfiguration(await response.json());
      } catch {
        throw new EditorApiError('INVALID_API_RESPONSE', 502);
      }
    },
    getPost: (id) => request(`/posts/${resourceId(id)}`, (value) => workspaceFor(value, { id })),
    lookup: (id) =>
      request(`/posts/by-client-draft-id/${resourceId(id)}`, (value) =>
        workspaceFor(value, { clientDraftId: id }),
      ),
    async list(cursor) {
      const query = new URLSearchParams({ scope: 'OWN', pageSize: '20' });
      if (cursor) {
        if (cursor.length > 2048) throw new EditorApiError('INVALID_CURSOR', 400);
        query.set('cursor', cursor);
      }
      // Pagination is part of the envelope, so validate both rather than inventing an empty page.
      let response: Response;
      try {
        response = await fetcher(`/api/editorial/posts?${query}`, {
          credentials: 'same-origin',
          cache: 'no-store',
          redirect: 'error',
          signal: AbortSignal.timeout(15_000),
        });
      } catch {
        throw new EditorApiError('DEPENDENCY_UNAVAILABLE', 503);
      }
      const envelope = await readResponse(response);
      try {
        if (!Array.isArray(envelope.data) || envelope.data.length > 50) throw new Error();
        return {
          data: envelope.data.map(validateWorkspaceSummary),
          pagination: validateCursorPagination(
            (envelope.meta as { pagination: unknown }).pagination,
          ),
        };
      } catch {
        throw new EditorApiError('INVALID_API_RESPONSE', 502);
      }
    },
    create: (id, content, key) =>
      request('/posts', (value) => workspaceFor(value, { clientDraftId: id }), {
        method: 'POST',
        content: { clientDraftId: resourceId(id), draft: content },
        key,
      }),
    save: (id, content, version, key) =>
      request(`/posts/${resourceId(id)}/draft`, (value) => workspaceFor(value, { id }), {
        method: 'PUT',
        content,
        version,
        key,
      }),
    upload: (id, file, name, key) =>
      request(`/posts/${resourceId(id)}/media`, (value) => validateMediaAsset(value, id), {
        method: 'POST',
        file,
        name,
        key,
      }),
    media: (id, mediaId) =>
      request(`/posts/${resourceId(id)}/media/${resourceId(mediaId)}`, (value) => {
        const media = validateMediaAsset(value, id);
        if (media.id !== mediaId) throw new EditorApiError('INVALID_API_RESPONSE', 502);
        return media;
      }),
    async download(id, mediaId) {
      let response: Response;
      try {
        response = await fetcher(
          `/api/editorial/posts/${resourceId(id)}/media/${resourceId(mediaId)}/w1600`,
          {
            credentials: 'same-origin',
            cache: 'no-store',
            redirect: 'error',
            signal: AbortSignal.timeout(45_000),
          },
        );
      } catch {
        throw new EditorApiError('DEPENDENCY_UNAVAILABLE', 503);
      }
      if (!response.ok) {
        await readResponse(response);
        throw new EditorApiError('INVALID_API_RESPONSE', 502);
      }
      try {
        validateApiDiagnostics(response.headers);
        const mime = response.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase();
        if (!mime || !['image/png', 'image/jpeg', 'image/webp'].includes(mime) || !response.body)
          throw new Error();
        const reader = response.body.getReader();
        const chunks: Uint8Array<ArrayBuffer>[] = [];
        let size = 0;
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 5 * 1024 * 1024) {
            await reader.cancel();
            throw new EditorApiError('UPLOAD_TOO_LARGE', 413);
          }
          chunks.push(new Uint8Array(value));
        }
        if (!size) throw new Error();
        return new Blob(chunks, { type: mime });
      } catch (error) {
        if (error instanceof EditorApiError) throw error;
        throw new EditorApiError('INVALID_API_RESPONSE', 502);
      }
    },
    workflow: (id, action, version, key, revisionId) =>
      request(`/posts/${resourceId(id)}/${action}`, (value) => workspaceFor(value, { id }), {
        method: 'POST',
        version,
        key,
        content: action === 'submit' ? { revisionId: resourceId(revisionId ?? '') } : {},
      }),
  };
}

export const editorApi = createEditorApi();
