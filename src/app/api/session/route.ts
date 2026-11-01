import { cookies } from 'next/headers';
import {
  bffErrorResponse,
  BffError,
  readJsonBody,
  requireLoginConfig,
  validateMutation,
} from '@/lib/bff';
import { isIdentityToken, validateWebSession } from '@/lib/auth-contract';
import { staffApi } from '@/lib/staff-api';
import { getStaffMember } from '@/lib/session';
import { clearAuthFlow } from '@/lib/auth-flow';
export async function GET() {
  try {
    requireLoginConfig();
    return Response.json(
      { member: await getStaffMember() },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return bffErrorResponse(error);
  }
}
export async function POST(request: Request) {
  try {
    const config = await validateMutation(request);
    const input = await readJsonBody(request, 70 * 1024);
    if (!isIdentityToken(input.idToken) || Object.keys(input).some((key) => key !== 'idToken'))
      throw new BffError(400, 'INVALID_REQUEST', 'Sign in with Google again before continuing.');
    const result = await staffApi('/v1/auth/web-session', {
      method: 'POST',
      contentType: 'application/json',
      body: JSON.stringify({ idToken: input.idToken }),
    });
    let session;
    try {
      session = validateWebSession(result.body.data);
    } catch {
      throw new BffError(502, 'INVALID_API_RESPONSE', 'Staff access is temporarily unavailable.');
    }
    if (encodeURIComponent(session.sessionCookie).length + config.sessionCookie.length > 3800)
      throw new BffError(
        502,
        'INVALID_API_RESPONSE',
        'The staff session could not be stored safely. Please try again.',
      );
    const store = await cookies();
    store.set(config.sessionCookie, session.sessionCookie, {
      httpOnly: true,
      secure: config.secureCookies,
      sameSite: 'lax',
      path: '/',
      expires: new Date(session.expiresAt),
      maxAge: Math.min(432000, Math.floor((Date.parse(session.expiresAt) - Date.now()) / 1000)),
    });
    store.set(config.csrfCookie, '', {
      httpOnly: true,
      secure: config.secureCookies,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
    await clearAuthFlow();
    return Response.json(
      { member: session.member, expiresAt: session.expiresAt },
      { headers: result.headers },
    );
  } catch (error) {
    return bffErrorResponse(error);
  }
}
