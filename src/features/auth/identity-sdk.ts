'use client';

import type { Auth, UserCredential } from 'firebase/auth';
import { authJson, AuthRequestError } from './client-api';

export type PublicIdentityConfig = {
  loginEnabled: boolean;
  identity?: { apiKey: string; authDomain: string; projectId: string; appId: string };
  authEmulatorOrigin?: string;
  redirectEnabled?: boolean;
};
type IdentitySdk = {
  auth: Auth;
  config: PublicIdentityConfig;
  api: typeof import('firebase/auth');
};
let pending: Promise<IdentitySdk> | undefined;

/** Initialize only after an explicit sign-in action or a validated redirect return. */
export function identitySdk() {
  pending ??= (async () => {
    const config = await authJson<PublicIdentityConfig>('/api/public-config');
    if (!config.loginEnabled || !config.identity) throw new AuthRequestError('LOGIN_DISABLED', 503);
    const [appApi, api] = await Promise.all([import('firebase/app'), import('firebase/auth')]);
    const existing = appApi.getApps().find((app) => app.name === 'blogpost-staff-identity');
    const app = existing ?? appApi.initializeApp(config.identity, 'blogpost-staff-identity');
    const auth = api.initializeAuth(app, {
      persistence: api.inMemoryPersistence,
      popupRedirectResolver: api.browserPopupRedirectResolver,
    });
    if (config.authEmulatorOrigin)
      api.connectAuthEmulator(auth, config.authEmulatorOrigin, { disableWarnings: true });
    return { auth, config, api };
  })().catch((error) => {
    pending = undefined;
    throw error;
  });
  return pending;
}
export async function googlePopup(): Promise<UserCredential> {
  const { auth, api } = await identitySdk();
  await api.signOut(auth);
  const provider = new api.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return api.signInWithPopup(auth, provider);
}
export async function googleRedirect() {
  const { auth, api, config } = await identitySdk();
  if (!config.redirectEnabled) throw new AuthRequestError('REDIRECT_UNAVAILABLE', 409);
  await api.signOut(auth);
  const provider = new api.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return api.signInWithRedirect(auth, provider);
}
export async function googleRedirectResult() {
  const { auth, api } = await identitySdk();
  return api.getRedirectResult(auth);
}
export async function clearIdentity() {
  if (pending) {
    const { auth, api } = await pending;
    await api.signOut(auth);
  }
}
