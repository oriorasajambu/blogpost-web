import { cookies } from 'next/headers';
import { editorialOperation, permitsEditorialRole } from '@/lib/editorial-policy';
import {
  bffErrorResponse,
  BackendResponseError,
  BffError,
  passthroughHeaders,
  readJsonBody,
  readLimitedBody,
  requireLoginConfig,
  validateMutation,
} from '@/lib/bff';
import { getStaffMember } from '@/lib/session';
import { staffApi } from '@/lib/staff-api';
import { getRequestContext } from '@/lib/request-context';
import { validateApiDiagnostics } from '@/lib/api-response';
import { uuidPattern } from '@/lib/request-policy';
import { validateApiResponse } from '@/lib/api-response';
import { staffRequestHeaders } from '@/lib/staff-request-policy';

type Context = { params: Promise<{ path: string[] }> };
async function handler(request: Request, context: Context) {
  try {
    const config = requireLoginConfig();
    const descriptor = editorialOperation(
      request.method,
      (await context.params).path,
      new URL(request.url).searchParams,
    );
    if (!descriptor)
      throw new BffError(404, 'RESOURCE_NOT_FOUND', 'This staff endpoint is unavailable.');
    const mutation = !['GET', 'HEAD'].includes(request.method);
    if (mutation)
      await validateMutation(
        request,
        descriptor.upload ? 'multipart/form-data' : 'application/json',
      );
    const member = await getStaffMember();
    if (!member)
      throw new BffError(
        401,
        'AUTHENTICATION_REQUIRED',
        'Sign in again to continue. Your local work has not been removed.',
      );
    if (!permitsEditorialRole(descriptor.access, member.role))
      throw new BffError(
        403,
        'INSUFFICIENT_PERMISSION',
        'Your current role cannot perform this action.',
      );
    const session = (await cookies()).get(config.sessionCookie)!.value;
    const forwarded = new Headers();
    if (descriptor.idempotency) {
      const key = request.headers.get('Idempotency-Key');
      if (!key || !uuidPattern.test(key))
        throw new BffError(400, 'INVALID_REQUEST', 'This operation needs a valid retry key.');
      forwarded.set('Idempotency-Key', key);
    }
    if (descriptor.expectedVersion) {
      const version = request.headers.get('X-Expected-Version');
      if (!version)
        throw new BffError(
          428,
          'PRECONDITION_REQUIRED',
          'Refresh the current item before changing it.',
        );
      if (!/^[1-9]\d{0,9}$/.test(version) || Number(version) > 2147483647)
        throw new BffError(400, 'INVALID_REQUEST', 'The current item version is invalid.');
      forwarded.set('X-Expected-Version', version);
    }
    let body: BodyInit | undefined;
    let contentType: string | undefined;
    if (descriptor.upload) {
      const bytes = await readLimitedBody(request, 6 * 1024 * 1024);
      let form: FormData;
      try {
        form = await new Response(bytes as Uint8Array<ArrayBuffer>, {
          headers: { 'Content-Type': request.headers.get('Content-Type')! },
        }).formData();
      } catch {
        throw new BffError(400, 'INVALID_REQUEST', 'Choose a valid image file.');
      }
      const file = form.get('file');
      if (
        !(file instanceof File) ||
        [...form.keys()].some((key) => key !== 'file') ||
        form.getAll('file').length !== 1
      )
        throw new BffError(400, 'INVALID_REQUEST', 'Choose one image file.');
      if (!file.size || file.size > 5 * 1024 * 1024)
        throw new BffError(413, 'PAYLOAD_TOO_LARGE', 'Choose an image smaller than 5 MiB.');
      body = bytes as Uint8Array<ArrayBuffer>;
      contentType = request.headers.get('Content-Type')!;
    } else if (mutation && descriptor.body) {
      body = JSON.stringify(await readJsonBody(request));
      contentType = 'application/json';
    } else if (mutation) {
      const bytes = await readLimitedBody(request, 1024);
      if (bytes.length)
        throw new BffError(
          400,
          'INVALID_REQUEST',
          'This operation does not accept a request body.',
        );
    }
    if (descriptor.binary) {
      const headers = staffRequestHeaders(await getRequestContext(), { session });
      const response = await fetch(`${config.backendOrigin}${descriptor.path}`, {
        headers,
        cache: 'no-store',
        redirect: 'error',
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) {
        try {
          const raw: unknown = await response.json();
          validateApiResponse(raw, response.status, response.headers);
          throw new BackendResponseError(
            raw,
            response.status,
            passthroughHeaders(response.headers),
          );
        } catch (error) {
          if (error instanceof BackendResponseError) throw error;
          throw new BffError(502, 'INVALID_API_RESPONSE', 'This image is temporarily unavailable.');
        }
      }
      const type = response.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase();
      if (
        response.status !== 200 ||
        !type ||
        !['image/png', 'image/jpeg', 'image/webp'].includes(type)
      ) {
        await response.body?.cancel();
        throw new BffError(502, 'INVALID_API_RESPONSE', 'This image is temporarily unavailable.');
      }
      try {
        validateApiDiagnostics(response.headers);
      } catch {
        await response.body?.cancel();
        throw new BffError(502, 'INVALID_API_RESPONSE', 'This image is temporarily unavailable.');
      }
      const output = passthroughHeaders(response.headers);
      output.set('Content-Type', type);
      output.set('Content-Disposition', 'inline');
      return new Response(response.body, { headers: output });
    }
    const result = await staffApi(descriptor.path, {
      method: request.method,
      body,
      contentType,
      session,
      headers: forwarded,
      timeout: descriptor.upload ? 30000 : 10000,
    });
    return Response.json(result.body, { status: result.status, headers: result.headers });
  } catch (error) {
    return bffErrorResponse(error);
  }
}
export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
