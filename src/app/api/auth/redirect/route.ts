import { BffError, bffErrorResponse, readJsonBody, validateMutation } from '@/lib/bff';
import { readAuthFlow, writeAuthFlow } from '@/lib/auth-flow';
import { getConfig } from '@/lib/config';
import { invitationTokenPattern } from '@/lib/auth-flow-policy';

const json = (data: unknown) =>
  Response.json(data, {
    headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' },
  });
export async function POST(request: Request) {
  try {
    await validateMutation(request);
    const body = await readJsonBody(request, 4096);
    if (Object.keys(body).some((key) => !['returnTo', 'invitationToken'].includes(key)))
      throw new BffError(400, 'INVALID_INPUT', 'The sign-in request is invalid.');
    if (
      body.invitationToken !== undefined &&
      (typeof body.invitationToken !== 'string' ||
        !invitationTokenPattern.test(body.invitationToken))
    )
      throw new BffError(400, 'INVALID_INPUT', 'Open the invitation link again before continuing.');
    const previous = await readAuthFlow();
    const flow = await writeAuthFlow({
      returnTo: body.returnTo,
      kind: 'redirect',
      invitationToken: body.invitationToken ?? previous?.invitationToken,
    });
    return json({ returnTo: flow.returnTo, state: flow.state });
  } catch (error) {
    return bffErrorResponse(error);
  }
}
export async function GET(request: Request) {
  try {
    // A GET has no browser Origin by default. Validate it through the same signed
    // cookie/header check, supplying only the already validated configured origin.
    const config = getConfig();
    const origin = request.headers.get('origin');
    if (
      (origin && origin !== config.webOrigin) ||
      request.headers.get('sec-fetch-site') === 'cross-site'
    )
      throw new BffError(403, 'CSRF_VALIDATION_FAILED', 'Start sign-in again from this page.');
    const headers = new Headers(request.headers);
    if (!origin && config.webOrigin) headers.set('origin', config.webOrigin);
    headers.set('content-type', 'application/json');
    await validateMutation(new Request(request.url, { method: 'POST', headers }));
    const flow = await readAuthFlow();
    if (!flow) return json({ pending: false, returnTo: '/studio/posts', invitation: false });
    if (flow.kind === 'redirect' && request.headers.get('x-oauth-state') !== flow.state)
      throw new BffError(403, 'OAUTH_STATE_INVALID', 'Start sign-in again from this page.');
    return json({ pending: true, returnTo: flow.returnTo, invitation: !!flow.invitationToken });
  } catch (error) {
    return bffErrorResponse(error);
  }
}
