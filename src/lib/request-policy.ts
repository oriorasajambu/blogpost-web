export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export const resourceUuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const versionPattern =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
export function diagnosticHeaders(
  source: Headers,
  installationId: string,
  appVersion: string,
): Headers {
  const ua = source.get('user-agent') ?? '';
  const platform = /Android/i.test(ua)
    ? 'ANDROID'
    : /iPhone|iPad/i.test(ua)
      ? 'IOS'
      : /Windows/i.test(ua)
        ? 'WINDOWS'
        : /CrOS/i.test(ua)
          ? 'CHROMEOS'
          : /Macintosh/i.test(ua)
            ? 'MACOS'
            : /Linux/i.test(ua)
              ? 'LINUX'
              : 'UNKNOWN';
  const requestedVersion = source.get('x-app-version') ?? '';
  const requestedLanguage =
    source.get('x-app-language') ??
    source.get('accept-language')?.split(',')[0].split(';')[0] ??
    'en';
  let language = 'en';
  try {
    if (requestedLanguage.length <= 64)
      language = Intl.getCanonicalLocales(requestedLanguage)[0] ?? 'en';
  } catch {
    /* unsupported diagnostics fall back safely */
  }
  const result = new Headers({
    'X-Device-ID': installationId,
    'X-Device-OS': platform,
    'X-Device-Version': 'unknown',
    'X-App-Version':
      requestedVersion.length <= 64 && versionPattern.test(requestedVersion)
        ? requestedVersion
        : appVersion,
    'X-App-Language': language,
  });
  const trace = source.get('traceparent');
  if (trace && /^00-(?!0{32})[0-9a-f]{32}-(?!0{16})[0-9a-f]{16}-[0-9a-f]{2}$/.test(trace))
    result.set('traceparent', trace);
  else {
    const traceId = crypto.randomUUID().replaceAll('-', '');
    const parentId = crypto.randomUUID().replaceAll('-', '').slice(0, 16);
    result.set('traceparent', `00-${traceId}-${parentId}-00`);
  }
  return result;
}
