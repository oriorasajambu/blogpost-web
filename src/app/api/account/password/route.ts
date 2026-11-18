import { cookies } from 'next/headers';
import { bffErrorResponse, BffError, readJsonBody, validateMutation } from '@/lib/bff';
import { validatePasswordChange } from '@/lib/auth-contract';
import { staffApi } from '@/lib/staff-api';
import { getStaffMember } from '@/lib/session';
import { clearAuthFlow } from '@/lib/auth-flow';

/**
 * Changes the signed-in member's password. The browser re-entered the current password just now and
 * sends the fresh identity token as proof. The API ends every session, so the cookies go too.
 */
export async function POST(request: Request) {
  try {
    const config = await validateMutation(request);
    const input = await readJsonBody(request, 70 * 1024);
    let body;
    try {
      body = validatePasswordChange(input);
    } catch {
      throw new BffError(422, 'VALIDATION_FAILED', 'Check the new password and try again.');
    }
    if (!(await getStaffMember()))
      throw new BffError(401, 'AUTHENTICATION_REQUIRED', 'Sign in again to continue.');
    const store = await cookies();
    const session = store.get(config.sessionCookie)!.value;
    const result = await staffApi('/v1/me/password', {
      method: 'POST',
      contentType: 'application/json',
      session,
      body: JSON.stringify(body),
    });
    for (const name of [config.sessionCookie, config.csrfCookie])
      store.set(name, '', {
        httpOnly: true,
        secure: config.secureCookies,
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
      });
    await clearAuthFlow();
    return Response.json({ status: 'ACCEPTED' }, { status: 202, headers: result.headers });
  } catch (error) {
    return bffErrorResponse(error);
  }
}
