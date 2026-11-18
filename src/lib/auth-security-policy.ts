type IdentityPolicy = {
  loginEnabled: boolean;
  webOrigin?: string;
  identity?: { authDomain: string; projectId: string };
  authEmulatorOrigin?: string;
  captchaSiteKey?: string;
  googleSignIn?: boolean;
};

/** Screens that talk to the identity provider or show a captcha. The profile hosts re-authentication. */
export const AUTH_SCREENS = [
  '/sign-in',
  '/invite',
  '/register',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
  '/confirm-email-change',
  '/studio/profile',
];
/**
 * The content security policy belongs to the document that was loaded, not to the page shown after a
 * client-side navigation. A document loaded from any other path (a public article, the Studio) cannot
 * reach the identity provider, so an auth screen reached that way has to be loaded afresh.
 */
export function needsAuthDocument(
  loadedPathname: string,
  authScreens: readonly string[] = AUTH_SCREENS,
) {
  return !authScreens.includes(loadedPathname);
}
export function redirectSupported(config: IdentityPolicy) {
  return !!(
    config.loginEnabled &&
    config.identity &&
    config.webOrigin &&
    (config.authEmulatorOrigin || config.identity.authDomain === new URL(config.webOrigin).hostname)
  );
}
export const authHelperFiles = new Set([
  'handler',
  'handler.js',
  'iframe',
  'iframe.js',
  'experiments.js',
  'links',
  'links.js',
]);

/** Only the auth screens opt in to the exact Google/Identity endpoints they need. */
export function contentSecurityPolicy(
  config: IdentityPolicy,
  pathname: string,
  nonce: string,
  development: boolean,
) {
  const helper = pathname.startsWith('/__/auth/');
  const authScreen = config.loginEnabled && (AUTH_SCREENS.includes(pathname) || helper);
  const captcha = authScreen && config.captchaSiteKey ? ' https://challenges.cloudflare.com' : '';
  const providerScripts = authScreen
    ? ' https://apis.google.com https://www.gstatic.com' + captcha
    : '';
  const frames =
    authScreen && config.identity
      ? ` 'self' https://${config.identity.authDomain} https://accounts.google.com${captcha}${config.authEmulatorOrigin ? ` ${config.authEmulatorOrigin}` : ''}`
      : " 'self'";
  const connections = authScreen
    ? ` https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com https://apis.google.com https://www.gstatic.com${config.authEmulatorOrigin ? ` ${config.authEmulatorOrigin}` : ''}`
    : '';
  return `default-src 'self'; script-src 'self' 'nonce-${nonce}'${providerScripts}${development ? " 'unsafe-eval'" : ''}; style-src 'self' 'unsafe-inline'; img-src 'self' blob:; font-src 'self'; connect-src 'self'${connections}${development ? ' ws: wss:' : ''}; frame-src${frames}; object-src 'none'; base-uri 'self'; form-action 'self'${helper ? ' https://accounts.google.com' : ''}; frame-ancestors ${helper ? "'self'" : "'none'"}`;
}

export function publicIdentityConfig(
  config: IdentityPolicy & {
    identity?: { apiKey: string; authDomain: string; projectId: string; appId: string };
  },
) {
  if (!config.loginEnabled || !config.identity) return { loginEnabled: false };
  return {
    loginEnabled: true,
    identity: {
      apiKey: config.identity.apiKey,
      authDomain: config.identity.authDomain,
      projectId: config.identity.projectId,
      appId: config.identity.appId,
    },
    ...(config.authEmulatorOrigin ? { authEmulatorOrigin: config.authEmulatorOrigin } : {}),
    redirectEnabled: redirectSupported(config),
    googleSignIn: config.googleSignIn !== false,
    ...(config.captchaSiteKey ? { captchaSiteKey: config.captchaSiteKey } : {}),
  };
}
