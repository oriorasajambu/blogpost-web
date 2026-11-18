import { bffErrorResponse, BffError, readJsonBody, validateMutation } from '@/lib/bff';
import { validateVerificationResend } from '@/lib/auth-contract';
import { staffApi } from '@/lib/staff-api';

/** Asks for a password reset link; the API answers identically for every address. */
export async function POST(request: Request) {
  try {
    await validateMutation(request);
    const input = await readJsonBody(request, 4 * 1024);
    let body;
    try {
      body = validateVerificationResend(input);
    } catch {
      throw new BffError(422, 'VALIDATION_FAILED', 'Check the email address and try again.');
    }
    const result = await staffApi('/v1/auth/forgot-password', {
      method: 'POST',
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
    return Response.json({ status: 'ACCEPTED' }, { status: 202, headers: result.headers });
  } catch (error) {
    return bffErrorResponse(error);
  }
}
