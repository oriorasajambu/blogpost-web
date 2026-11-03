import { BffError } from './bff-error';

/** Bound bytes and elapsed time before a browser-controlled body reaches the API. */
export async function readLimitedBody(
  request: Request,
  limit: number,
  timeoutMilliseconds = 15000,
): Promise<Uint8Array> {
  const length = request.headers.get('Content-Length');
  if (length && (!/^\d+$/.test(length) || Number(length) > limit))
    throw new BffError(413, 'PAYLOAD_TOO_LARGE', 'This request is too large.');
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new BffError(408, 'REQUEST_TIMEOUT', 'The request took too long. Try again.')),
      timeoutMilliseconds,
    );
  });
  try {
    while (true) {
      const next = await Promise.race([reader.read(), timeout]);
      if (next.done) break;
      size += next.value.byteLength;
      if (size > limit) throw new BffError(413, 'PAYLOAD_TOO_LARGE', 'This request is too large.');
      chunks.push(next.value);
    }
    const output = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      output.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return output;
  } catch (error) {
    void reader.cancel().catch(() => {});
    throw error;
  } finally {
    clearTimeout(timer);
    reader.releaseLock();
  }
}

export async function readJsonBody(
  request: Request,
  limit = 1048576,
): Promise<Record<string, unknown>> {
  try {
    const bytes = await readLimitedBody(request, limit);
    const value: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (typeof value !== 'object' || value === null || Array.isArray(value))
      throw new Error('Invalid object');
    return value as Record<string, unknown>;
  } catch (error) {
    if (error instanceof BffError) throw error;
    throw new BffError(400, 'INVALID_REQUEST', 'Check the request and try again.');
  }
}
