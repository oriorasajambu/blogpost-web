import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';
import { safeReturnTo } from './auth-navigation';

export type AuthFlow = {
  version: 1;
  returnTo: string;
  invitationToken?: string;
  kind: 'invitation' | 'redirect';
  state: string;
  expiresAt: number;
  sessionFingerprint: string;
};
export const invitationTokenPattern = /^[A-Za-z0-9_-]{43}$/;
export const authFlowSeconds = 600;
const flowKey = (secret: string) =>
  createHash('sha256').update('blogpost.auth-flow.v1\0').update(secret).digest();
export function authSessionFingerprint(secret: string, session: string) {
  return createHmac('sha256', secret)
    .update('blogpost.auth-flow.session.v1\0')
    .update(session)
    .digest('hex');
}
export function createAuthFlow(
  secret: string,
  session: string,
  details: {
    returnTo?: unknown;
    invitationToken?: unknown;
    kind: AuthFlow['kind'];
  },
  now = Date.now(),
) {
  if (
    details.invitationToken !== undefined &&
    (typeof details.invitationToken !== 'string' ||
      !invitationTokenPattern.test(details.invitationToken))
  )
    throw new Error('Invalid invitation.');
  const flow: AuthFlow = {
    version: 1,
    returnTo: safeReturnTo(details.returnTo),
    kind: details.kind,
    state: randomUUID(),
    expiresAt: now + authFlowSeconds * 1000,
    sessionFingerprint: authSessionFingerprint(secret, session),
    ...(details.invitationToken ? { invitationToken: details.invitationToken as string } : {}),
  };
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', flowKey(secret), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(flow), 'utf8'), cipher.final()]);
  return { value: Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url'), flow };
}
export function decryptAuthFlow(
  value: string | undefined,
  secret: string,
  session: string,
  now = Date.now(),
): AuthFlow | null {
  try {
    if (!value || value.length > 4096 || !/^[A-Za-z0-9_-]+$/.test(value)) return null;
    const bytes = Buffer.from(value, 'base64url');
    const decipher = createDecipheriv('aes-256-gcm', flowKey(secret), bytes.subarray(0, 12));
    decipher.setAuthTag(bytes.subarray(12, 28));
    const flow: AuthFlow = JSON.parse(
      Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8'),
    );
    const fingerprint = authSessionFingerprint(secret, session);
    if (
      flow.version !== 1 ||
      !['invitation', 'redirect'].includes(flow.kind) ||
      typeof flow.state !== 'string' ||
      !/^[a-f0-9-]{36}$/.test(flow.state) ||
      typeof flow.returnTo !== 'string' ||
      safeReturnTo(flow.returnTo) !== flow.returnTo ||
      !Number.isSafeInteger(flow.expiresAt) ||
      flow.expiresAt <= now ||
      flow.expiresAt > now + authFlowSeconds * 1000 ||
      typeof flow.sessionFingerprint !== 'string' ||
      flow.sessionFingerprint.length !== fingerprint.length ||
      !timingSafeEqual(Buffer.from(flow.sessionFingerprint), Buffer.from(fingerprint)) ||
      (flow.invitationToken !== undefined && !invitationTokenPattern.test(flow.invitationToken))
    )
      return null;
    return flow;
  } catch {
    return null;
  }
}
