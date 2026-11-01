import 'server-only';
import { cookies } from 'next/headers';
import { getConfig } from './config';
import {
  createAuthFlow,
  decryptAuthFlow,
  authFlowSeconds,
  type AuthFlow,
} from './auth-flow-policy';

export async function readAuthFlow() {
  const config = getConfig();
  if (!config.loginEnabled || !config.csrfSecret) return null;
  const jar = await cookies();
  return decryptAuthFlow(
    jar.get(config.oauthStateCookie)?.value,
    config.csrfSecret,
    jar.get(config.sessionCookie)?.value ?? '',
  );
}
export async function writeAuthFlow(details: {
  returnTo?: unknown;
  invitationToken?: unknown;
  kind: AuthFlow['kind'];
}) {
  const config = getConfig();
  if (!config.loginEnabled || !config.csrfSecret) throw new Error('Staff sign-in is unavailable.');
  const jar = await cookies();
  const { value, flow } = createAuthFlow(
    config.csrfSecret,
    jar.get(config.sessionCookie)?.value ?? '',
    details,
  );
  jar.set(config.oauthStateCookie, value, {
    httpOnly: true,
    secure: config.secureCookies,
    sameSite: 'lax',
    path: '/',
    maxAge: authFlowSeconds,
    expires: new Date(flow.expiresAt),
  });
  return flow;
}
export async function clearAuthFlow() {
  const config = getConfig();
  (await cookies()).set(config.oauthStateCookie, '', {
    httpOnly: true,
    secure: config.secureCookies,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
