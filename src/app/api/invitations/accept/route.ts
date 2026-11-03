import { bffErrorResponse, BffError, readJsonBody, validateMutation } from '@/lib/bff';
import { isIdentityToken, validateStaffMember } from '@/lib/auth-contract';
import { staffApi } from '@/lib/staff-api';
import { readAuthFlow } from '@/lib/auth-flow';
import { uuidPattern } from '@/lib/request-policy';
export async function POST(request: Request) {
  try {
    await validateMutation(request);
    const input = await readJsonBody(request, 70 * 1024);
    const flow = input.flow === true ? await readAuthFlow() : null;
    const token = input.flow === true ? flow?.invitationToken : input.token;
    if (
      !isIdentityToken(input.idToken) ||
      typeof token !== 'string' ||
      !/^[A-Za-z0-9_-]{43}$/.test(token) ||
      (input.flow !== undefined && input.flow !== true) ||
      (input.flow === true && input.token !== undefined) ||
      Object.keys(input).some((key) => !['idToken', 'token', 'flow'].includes(key))
    )
      throw new BffError(
        400,
        'INVALID_REQUEST',
        'Open your invitation link again and sign in with the invited account.',
      );
    const key = request.headers.get('Idempotency-Key');
    if (!key || !uuidPattern.test(key))
      throw new BffError(
        400,
        'INVALID_REQUEST',
        'Refresh the invitation page before trying again.',
      );
    const result = await staffApi('/v1/invitations/accept', {
      method: 'POST',
      body: JSON.stringify({ token }),
      contentType: 'application/json',
      idToken: input.idToken,
      headers: new Headers({ 'Idempotency-Key': key }),
    });
    const member = validateStaffMember(result.body.data);
    // Keep the encrypted receipt until session exchange so a lost acknowledgement
    // can replay the same invitation operation and idempotency key.
    return Response.json({ member }, { headers: result.headers });
  } catch (error) {
    return bffErrorResponse(error);
  }
}
