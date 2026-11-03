export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export const resourceUuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const versionPattern =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
function validTraceState(value: string) {
  if (value.length > 512) return false;
  const entries = value.split(',');
  if (entries.length > 32) return false;
  const keys = new Set<string>();
  for (const raw of entries) {
    const entry = raw.replace(/^[ \t]+|[ \t]+$/g, '');
    if (!entry) continue;
    const separator = entry.indexOf('=');
    const key = entry.slice(0, separator),
      state = entry.slice(separator + 1);
    if (
      separator < 1 ||
      !/^(?:[a-z][a-z0-9_*\/-]{0,255}|[a-z0-9][a-z0-9_*\/-]{0,240}@[a-z][a-z0-9_*\/-]{0,13})$/.test(
        key,
      ) ||
      !/^[\x20-\x2b\x2d-\x3c\x3e-\x7e]{0,255}[\x21-\x2b\x2d-\x3c\x3e-\x7e]$/.test(state) ||
      keys.has(key)
    )
      return false;
    keys.add(key);
  }
  return true;
}
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
  if (trace && /^00-(?!0{32})[0-9a-f]{32}-(?!0{16})[0-9a-f]{16}-[0-9a-f]{2}$/.test(trace)) {
    result.set('traceparent', trace);
    const state = source.get('tracestate');
    if (state && validTraceState(state)) result.set('tracestate', state);
  } else {
    const traceId = crypto.randomUUID().replaceAll('-', '');
    const parentId = crypto.randomUUID().replaceAll('-', '').slice(0, 16);
    result.set('traceparent', `00-${traceId}-${parentId}-00`);
  }
  return result;
}
