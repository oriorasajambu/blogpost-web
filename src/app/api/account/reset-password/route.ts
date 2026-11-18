import { bffErrorResponse, BffError, readJsonBody, validateMutation } from '@/lib/bff';
import { validatePasswordReset } from '@/lib/auth-contract';
import { staffApi } from '@/lib/staff-api';

/** Completes a reset with the emailed code. The API checks the password and ends every session. */
export async function POST(request: Request) {
  try {
    await validateMutation(request);
    const input = await readJsonBody(request, 4 * 1024);
    let body;
    try {
      body = validatePasswordReset(input);
    } catch {
      throw new BffError(
        422,
        'VALIDATION_FAILED',
        'Check the link and use a password of 12 to 128 characters.',
      );
    }
    const result = await staffApi('/v1/auth/reset-password', {
      method: 'POST',
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
    return Response.json({ status: 'ACCEPTED' }, { status: 202, headers: result.headers });
  } catch (error) {
    return bffErrorResponse(error);
  }
}
