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
  if (loginEnabled)
    throw new Error(
      'Login is not enabled in this public-reading foundation. Complete the session/CSRF stage first.',
    );
  const stackId = env.LOCAL_STACK_ID ?? 'reading-foundation';
  if (!/^[a-z0-9][a-z0-9-]{0,47}$/.test(stackId)) throw new Error('Invalid LOCAL_STACK_ID.');
  return {
    environment: environment as AppEnvironment,
    backendOrigin: origin(backend, 'BACKEND_ORIGIN'),
    webOrigin,
    loginEnabled,
    stackId,
    installationCookie: local ? `blogpost_${stackId}_installation` : '__Host-blogpost_installation',
  };
}
