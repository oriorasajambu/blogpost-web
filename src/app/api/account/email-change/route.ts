import { cookies } from 'next/headers';
import { bffErrorResponse, BffError, readJsonBody, validateMutation } from '@/lib/bff';
import { validateEmailChange } from '@/lib/auth-contract';
import { staffApi } from '@/lib/staff-api';
import { getStaffMember } from '@/lib/session';

/** Starts an email change; the new address must confirm before anything changes. */
export async function POST(request: Request) {
  try {
    const config = await validateMutation(request);
    const input = await readJsonBody(request, 70 * 1024);
    let body;
    try {
      body = validateEmailChange(input);
    } catch {
      throw new BffError(422, 'VALIDATION_FAILED', 'Check the new email address and try again.');
    }
    if (!(await getStaffMember()))
      throw new BffError(401, 'AUTHENTICATION_REQUIRED', 'Sign in again to continue.');
    const session = (await cookies()).get(config.sessionCookie)!.value;
    const result = await staffApi('/v1/me/email-change', {
      method: 'POST',
      contentType: 'application/json',
      session,
      body: JSON.stringify(body),
    });
    return Response.json({ status: 'ACCEPTED' }, { status: 202, headers: result.headers });
  } catch (error) {
    return bffErrorResponse(error);
  }
}
