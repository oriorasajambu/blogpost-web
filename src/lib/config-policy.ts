export type AppEnvironment = 'development' | 'staging' | 'production';
export function parseConfig(env: Record<string, string | undefined>) {
  const environment = env.APP_ENV ?? 'development';
  if (!['development', 'staging', 'production'].includes(environment))
    throw new Error('Invalid APP_ENV.');
  if (env.K_SERVICE && environment === 'development')
    throw new Error('Cloud Run cannot use Development.');
  if (env.BUILT_APP_ENV && env.BUILT_APP_ENV !== environment)
    throw new Error('Build/runtime environment mismatch.');
  const local = environment === 'development';
  if (!local && env.NODE_ENV && env.NODE_ENV !== 'production')
    throw new Error('Staging and Production require NODE_ENV=production.');
  if (
    !local &&
    Object.entries(env).some(([key, value]) => value && /EMULATOR|FIXTURE|MOCK_/.test(key))
  )
    throw new Error('Development controls cannot be enabled in cloud environments.');
  const origin = (value: string, label: string) => {
    const url = new URL(value);
    if (url.username || url.password || url.pathname !== '/' || url.search || url.hash)
      throw new Error(`${label} must be an origin.`);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error(`${label} must use HTTP(S).`);
    if (
      !local &&
      (url.protocol !== 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
    )
      throw new Error(`${label} requires a cloud HTTPS origin.`);
    if (local && !['localhost', '127.0.0.1', '[::1]', 'api', 'mock'].includes(url.hostname))
      throw new Error('Development must use a local backend and web origin.');
    return url.origin;
  };
  const backend = env.BACKEND_ORIGIN ?? (local ? 'http://localhost:4010' : undefined);
  if (!backend) throw new Error('BACKEND_ORIGIN is required.');
  const loginEnabled = env.WEB_LOGIN_ENABLED === 'true';
  if (env.WEB_LOGIN_ENABLED && !['true', 'false'].includes(env.WEB_LOGIN_ENABLED))
    throw new Error('Invalid WEB_LOGIN_ENABLED.');
  const webOrigin = env.WEB_ORIGIN ? origin(env.WEB_ORIGIN, 'WEB_ORIGIN') : undefined;
  const csrfSecret = env.WEB_CSRF_SECRET;
  let identity:
    { apiKey: string; authDomain: string; projectId: string; appId: string } | undefined;
  let authEmulatorOrigin: string | undefined;
  if (loginEnabled) {
    if (!webOrigin) throw new Error('WEB_ORIGIN is required for session/CSRF protection.');
    if (
      !csrfSecret ||
      new TextEncoder().encode(csrfSecret).length < 32 ||
      /[\r\n\0]/.test(csrfSecret)
    )
      throw new Error(
        'A WEB_CSRF_SECRET of at least 32 bytes is required for session/CSRF protection.',
      );
    const required = (name: string, max = 256) => {
      const value = env[name];
      if (!value || value.length > max || !/^[\x21-\x7e]+$/.test(value))
        throw new Error(`${name} is required and must be a valid public identity setting.`);
      return value;
    };
    const authDomain = required('IDENTITY_AUTH_DOMAIN', 253);
    if (!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(authDomain))
      throw new Error('IDENTITY_AUTH_DOMAIN must be a hostname without a path or credentials.');
    if (!local && ['localhost', '127.0.0.1'].includes(authDomain))
      throw new Error('IDENTITY_AUTH_DOMAIN requires a cloud hostname.');
    const projectId = required('IDENTITY_PROJECT_ID', 128);
    if (!/^[a-z0-9][a-z0-9-]*$/.test(projectId)) throw new Error('Invalid IDENTITY_PROJECT_ID.');
    if (!local && projectId.startsWith('demo-'))
      throw new Error('Cloud identity cannot use an emulator demo project.');
    const appId = required('IDENTITY_WEB_APP_ID');
    if (!/^1:\d+:web:[A-Za-z0-9]+$/.test(appId))
      throw new Error('IDENTITY_WEB_APP_ID must be a Firebase web app ID.');
    identity = { apiKey: required('IDENTITY_WEB_API_KEY'), authDomain, projectId, appId };
    if (env.IDENTITY_AUTH_EMULATOR_ORIGIN) {
      if (!local) throw new Error('Identity emulator is Development only.');
      if (!projectId.startsWith('demo-'))
        throw new Error('Identity emulator requires an isolated demo- project.');
      authEmulatorOrigin = origin(
        env.IDENTITY_AUTH_EMULATOR_ORIGIN,
        'IDENTITY_AUTH_EMULATOR_ORIGIN',
      );
      if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(authEmulatorOrigin).hostname))
        throw new Error('Identity emulator must be on browser loopback.');
    }
  }
  const stackId = env.LOCAL_STACK_ID ?? 'reading-foundation';
  if (!/^[a-z0-9][a-z0-9-]{0,47}$/.test(stackId)) throw new Error('Invalid LOCAL_STACK_ID.');
  return {
    environment: environment as AppEnvironment,
    backendOrigin: origin(backend, 'BACKEND_ORIGIN'),
    webOrigin,
    loginEnabled,
    identity,
    authEmulatorOrigin,
    csrfSecret: loginEnabled ? csrfSecret : undefined,
    secureCookies: !local || webOrigin?.startsWith('https:') === true,
    stackId,
    installationCookie: local ? `blogpost_${stackId}_installation` : '__Host-blogpost_installation',
    sessionCookie: local ? `blogpost_${stackId}_session` : '__Host-blogpost_session',
    csrfCookie: local ? `blogpost_${stackId}_csrf` : '__Host-blogpost_csrf',
    oauthStateCookie: local ? `blogpost_${stackId}_oauth_state` : '__Host-blogpost_oauth_state',
  };
}
