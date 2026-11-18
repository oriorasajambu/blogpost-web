import { bffErrorResponse, BffError, readJsonBody, validateMutation } from '@/lib/bff';
import { validateRegistration } from '@/lib/auth-contract';
import { staffApi } from '@/lib/staff-api';

/** Public registration. The password is forwarded once to the API and never stored or logged here. */
export async function POST(request: Request) {
  try {
    await validateMutation(request);
    const input = await readJsonBody(request, 8 * 1024);
    let body;
    try {
      body = validateRegistration(input);
    } catch {
      throw new BffError(
        422,
        'VALIDATION_FAILED',
        'Check the email address and password, then try again.',
      );
    }
    const result = await staffApi('/v1/auth/register', {
      method: 'POST',
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
    return Response.json({ status: 'ACCEPTED' }, { status: 202, headers: result.headers });
  } catch (error) {
    return bffErrorResponse(error);
  }
}
