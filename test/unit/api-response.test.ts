import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ContractError } from '../../src/lib/api-contract';
import { validateApiDiagnostics, validateApiResponse } from '../../src/lib/api-response';

const body = JSON.parse(
  readFileSync(
    new URL('../../contracts/fixtures/operations/listPublicPosts.response.json', import.meta.url),
    'utf8',
  ),
);
function headers() {
  return new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'X-Trace-ID': body.traceId,
    'X-API-Contract-Version': '1.0.0',
  });
}

test('JSON transport retains the validated envelope and matching diagnostics', () => {
  assert.equal(validateApiResponse(body, 200, headers()), body);
  const mixedCase = headers();
  mixedCase.set('Content-Type', 'Application/JSON; Charset=UTF-8');
  assert.equal(validateApiResponse(body, 200, mixedCase), body);
});

test('JSON transport requires the actual application/json media type', () => {
  for (const contentType of [
    '',
    'text/html',
    'text/application/json',
    'application/jsonp',
    'application/problem+json',
  ]) {
    const incoming = headers();
    if (contentType) incoming.set('Content-Type', contentType);
    else incoming.delete('Content-Type');
    assert.throws(() => validateApiResponse(body, 200, incoming), ContractError, contentType);
  }
});

test('all API responses require a supported contract major and a valid trace identifier', () => {
  for (const [name, value] of [
    ['X-Trace-ID', ''],
    ['X-Trace-ID', '00000000000000000000000000000000'],
    ['X-Trace-ID', 'UPSTREAM_INTERNAL_DETAILS'],
    ['X-Trace-ID', `${body.traceId},${body.traceId}`],
    ['X-API-Contract-Version', ''],
    ['X-API-Contract-Version', '2.0.0'],
    ['X-API-Contract-Version', '01.1.0'],
    ['X-API-Contract-Version', '1.1'],
  ]) {
    const incoming = headers();
    if (value) incoming.set(name, value);
    else incoming.delete(name);
    assert.throws(() => validateApiDiagnostics(incoming), ContractError, `${name}: ${value}`);
  }
});

test('JSON transport accepts additive minor responses while requiring exact version agreement', () => {
  const additive = structuredClone(body);
  additive.meta.contractVersion = '1.1.0';
  additive.data[0].newOptionalField = { supported: true };
  const incoming = headers();
  incoming.set('X-API-Contract-Version', '1.1.0');
  assert.equal(validateApiResponse(additive, 200, incoming), additive);
  assert.equal(validateApiDiagnostics(incoming).contractVersion, '1.1.0');
  assert.throws(() => validateApiResponse(additive, 200, headers()), ContractError);
  assert.throws(() => validateApiResponse(body, 200, incoming), ContractError);
});

test('JSON transport rejects disagreement between body, status and trace headers', () => {
  const incoming = headers();
  incoming.set('X-Trace-ID', '0123456789abcdef0123456789abcdef');
  assert.throws(() => validateApiResponse(body, 200, incoming), ContractError);
  assert.throws(() => validateApiResponse(body, 404, headers()), ContractError);
});
