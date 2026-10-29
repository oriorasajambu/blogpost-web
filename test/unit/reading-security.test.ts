import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseConfig } from '../../src/lib/config-policy';
import { diagnosticHeaders, uuidPattern } from '../../src/lib/request-policy';
import { mediaUrl, safeMarkdownUrl } from '../../src/lib/markdown';
import { Markdown } from '../../src/components/article/markdown';

const postId = '10000000-0000-4000-8000-000000000001';
const mediaId = '50000000-0000-4000-8000-000000000001';
const installationId = '90000000-0000-4000-8000-000000000001';
const cloud = {
  APP_ENV: 'production',
  BACKEND_ORIGIN: 'https://api.example.test',
  WEB_ORIGIN: 'https://journal.example.test',
};

test('public-reading startup works before the final web origin is known', () => {
  const config = parseConfig({ APP_ENV: 'production', BACKEND_ORIGIN: cloud.BACKEND_ORIGIN });
  assert.equal(config.webOrigin, undefined);
  assert.equal(config.loginEnabled, false);
  assert.equal(config.installationCookie, '__Host-blogpost_installation');
});

test('cloud configuration rejects local controls and unsafe origin shapes', () => {
  for (const backend of [
    'http://api.example.test',
    'https://localhost:8080',
    'https://127.0.0.1',
    'https://[::1]',
    'https://user:password@api.example.test',
    'https://api.example.test/v1',
    'https://api.example.test?origin=other',
    'https://api.example.test/#fragment',
    'file:///server',
  ]) {
    assert.throws(() => parseConfig({ ...cloud, BACKEND_ORIGIN: backend }), backend);
  }
  for (const control of ['FIREBASE_AUTH_EMULATOR_HOST', 'MOCK_ORIGIN', 'FIXTURE_IDENTITY']) {
    assert.throws(() => parseConfig({ ...cloud, [control]: 'enabled' }), /Development controls/);
    assert.throws(
      () => parseConfig({ ...cloud, APP_ENV: 'staging', [control]: 'enabled' }),
      /Development controls/,
    );
  }
  assert.throws(() => parseConfig({ ...cloud, BUILT_APP_ENV: 'staging' }), /mismatch/);
  assert.throws(
    () => parseConfig({ APP_ENV: 'development', K_SERVICE: 'blogpost-web' }),
    /Cloud Run/,
  );
  assert.throws(() => parseConfig({ ...cloud, APP_ENV: 'preview' }), /Invalid APP_ENV/);
  assert.throws(() => parseConfig({ APP_ENV: 'production' }), /BACKEND_ORIGIN is required/);
});

test('development uses isolated local installation cookies and refuses cloud destinations', () => {
  const a = parseConfig({
    APP_ENV: 'development',
    LOCAL_STACK_ID: 'writing-a',
    BACKEND_ORIGIN: 'http://api:8080',
  });
  const b = parseConfig({
    APP_ENV: 'development',
    LOCAL_STACK_ID: 'writing-b',
    BACKEND_ORIGIN: 'http://mock:4010',
  });
  assert.notEqual(a.installationCookie, b.installationCookie);
  assert.throws(
    () => parseConfig({ APP_ENV: 'development', LOCAL_STACK_ID: '../other' }),
    /Invalid LOCAL_STACK_ID/,
  );
  assert.throws(
    () => parseConfig({ APP_ENV: 'development', BACKEND_ORIGIN: cloud.BACKEND_ORIGIN }),
    /Development must use a local/,
  );
  assert.throws(() => parseConfig({ ...cloud, WEB_LOGIN_ENABLED: 'true' }), /session\/CSRF/);
  assert.throws(
    () => parseConfig({ ...cloud, WEB_LOGIN_ENABLED: 'yes' }),
    /Invalid WEB_LOGIN_ENABLED/,
  );
});

test('metadata describes the visitor, retains valid bundle versions, and omits browser credentials', () => {
  const incoming = new Headers({
    'user-agent': 'Mozilla/5.0 (Linux; Android 15; Mobile)',
    'x-device-id': 'browser-controlled',
    'x-device-os': 'SERVER',
    'x-device-version': 'secret',
    'x-app-version': '2.3.4-rc.1+sha.abcdef',
    'x-app-language': 'id-id',
    cookie: 'private=value',
    authorization: 'Bearer private',
    'x-blogpost-web-session': 'private',
    traceparent: '00-0123456789abcdef0123456789abcdef-0123456789abcdef-01',
  });
  const headers = diagnosticHeaders(incoming, installationId, '0.0.0');
  assert.equal(headers.get('x-device-id'), installationId);
  assert.equal(headers.get('x-device-os'), 'ANDROID');
  assert.equal(headers.get('x-device-version'), 'unknown');
  assert.equal(headers.get('x-app-version'), '2.3.4-rc.1+sha.abcdef');
  assert.equal(headers.get('x-app-language'), 'id-ID');
  assert.equal(headers.get('traceparent'), incoming.get('traceparent'));
  for (const forbidden of ['cookie', 'authorization', 'x-blogpost-web-session', 'user-agent'])
    assert.equal(headers.has(forbidden), false, forbidden);
});

test('malformed diagnostics fall back and start a valid trace context', () => {
  const headers = diagnosticHeaders(
    new Headers({
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'x-app-version': '01.2.3,4.5.6',
      'x-app-language': 'en-US,id-ID',
      traceparent: '00-00000000000000000000000000000000-0123456789abcdef-01',
    }),
    installationId,
    '0.1.0',
  );
  assert.equal(headers.get('x-device-os'), 'WINDOWS');
  assert.equal(headers.get('x-app-version'), '0.1.0');
  assert.equal(headers.get('x-app-language'), 'en');
  assert.match(
    headers.get('traceparent') ?? '',
    /^00-(?!0{32})[0-9a-f]{32}-(?!0{16})[0-9a-f]{16}-00$/,
  );
  assert.equal(
    diagnosticHeaders(
      new Headers({ 'accept-language': 'fr-CA,fr;q=0.8,en;q=0.5' }),
      installationId,
      '0.1.0',
    ).get('x-app-language'),
    'fr-CA',
  );
});

test('anonymous requests generate fresh trace contexts and report unknown or ChromeOS platforms', () => {
  const first = diagnosticHeaders(new Headers(), installationId, '0.0.0');
  const second = diagnosticHeaders(new Headers(), installationId, '0.0.0');
  assert.equal(first.get('x-device-os'), 'UNKNOWN');
  assert.match(first.get('traceparent') ?? '', /^00-[a-f0-9]{32}-[a-f0-9]{16}-00$/);
  assert.notEqual(first.get('traceparent'), second.get('traceparent'));
  assert.equal(
    diagnosticHeaders(
      new Headers({ 'user-agent': 'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0)' }),
      installationId,
      '0.0.0',
    ).get('x-device-os'),
    'CHROMEOS',
  );
});

test('Markdown URL policy rejects executable, credentialed, and cross-origin-relative forms', () => {
  for (const unsafe of [
    'javascript:alert(1)',
    'data:text/html,bad',
    'vbscript:bad',
    '//evil.example/path',
    '/\\evil.example/path',
    'https://user:secret@example.test/',
    'https://example.test/\nnext',
    'javascript\t:alert(1)',
    ' https://example.test',
    '',
  ]) {
    assert.equal(safeMarkdownUrl(unsafe), undefined, unsafe);
  }
  for (const safe of [
    'https://example.test/article?q=one',
    'http://example.test/article',
    'mailto:writer@example.test',
    '/posts/a-story',
    '#a-section',
  ])
    assert.equal(safeMarkdownUrl(safe), safe);
  assert.equal(mediaUrl(`media://${mediaId}`, postId), `/media/${postId}/${mediaId}/w960`);
  for (const unsafe of [
    `https://example.test/${mediaId}`,
    `media://${mediaId}/../other`,
    `media://${mediaId}?origin=evil`,
    'media://5A000000-0000-4000-8000-000000000001',
    'media://not-a-uuid',
  ])
    assert.equal(mediaUrl(unsafe, postId), undefined);
  assert.equal(mediaUrl(`media://${mediaId}`, '../other'), undefined);
});

test('resource media UUIDs are independent of the installation UUID v4 requirement', () => {
  const resourceV7 = '0194cc20-90b4-7000-8000-000000000001';
  assert.equal(uuidPattern.test(resourceV7), false);
  assert.equal(uuidPattern.test(installationId), true);
  assert.equal(
    mediaUrl(`media://${resourceV7}`, resourceV7),
    `/media/${resourceV7}/${resourceV7}/w960`,
  );
});

function render(
  source: string,
  media: Array<{ mediaId: string; width: number; height: number }> = [],
) {
  return renderToStaticMarkup(createElement(Markdown, { source, postId, media }));
}

test('Markdown displays HTML-looking source as escaped text and blocks unsafe links/images', () => {
  const html = render(
    '<script>alert("literal")</script>\n\n<img src="https://example.invalid/pixel.png">\n\n[unsafe](java&#x73;cript:alert%281%29)\n\n![tracking image](https://example.invalid/pixel.png)',
  );
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('&lt;img'));
  assert.doesNotMatch(html, /<script|<img|href="javascript:/);
  assert.ok(html.includes('Image unavailable: tracking image'));
});

test('Markdown renders only approved media descriptors with their real dimensions', () => {
  const source = `![A diagram](media://${mediaId})`;
  assert.doesNotMatch(render(source), /<img/);
  const approved = render(source, [{ mediaId, width: 640, height: 480 }]);
  assert.ok(approved.includes(`src="/media/${postId}/${mediaId}/w960"`));
  assert.ok(approved.includes('alt="A diagram"'));
  assert.ok(approved.includes('width="640"'));
  assert.ok(approved.includes('height="480"'));
  assert.ok(
    render(`![](media://${mediaId} "decorative")`, [{ mediaId, width: 640, height: 480 }]).includes(
      'alt=""',
    ),
  );
});

test('Markdown tables have header semantics and overflow access; unsupported GFM remains literal', () => {
  const html = render(
    '| Name | Value |\n| --- | --- |\n| One | Two |\n\n~~Not strikethrough~~\n\n- [ ] Plain task syntax\n\n```typescript\nconst answer = 42;\n```',
  );
  assert.ok(html.includes('<th scope="col">Name</th>'));
  assert.ok(html.includes('role="region"'));
  assert.ok(html.includes('tabindex="0"'));
  assert.ok(html.includes('~~Not strikethrough~~'));
  assert.ok(html.includes('[ ] Plain task syntax'));
  assert.doesNotMatch(html, /<del|type="checkbox"/);
  assert.ok(html.includes('Copy code'));
  assert.ok(html.includes('language-typescript'));
});
