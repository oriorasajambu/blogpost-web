import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { forwardMediaError, ownedError } from '../../src/lib/api-errors';
import { validateEnvelope } from '../../src/lib/api-contract';
const missing = JSON.parse(
  readFileSync(
    new URL('../../contracts/fixtures/errors/resource-not-found.json', import.meta.url),
    'utf8',
  ),
);
test('media errors retain the backend envelope, HTTP status, and diagnostics without wrapping', async () => {
  const response = await forwardMediaError(
    Response.json(missing, {
      status: 404,
      headers: {
        'X-Trace-ID': missing.traceId,
        'X-API-Contract-Version': '1.0.0',
        'Retry-After': '5',
      },
    }),
  );
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), missing);
  assert.equal(response.headers.get('X-Trace-ID'), missing.traceId);
  assert.equal(response.headers.get('Retry-After'), '5');
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
});
test('malformed media errors become a temporary proxy failure without disclosing upstream text', async () => {
  const response = await forwardMediaError(
    new Response('internal storage details', { status: 500 }),
  );
  assert.equal(response.status, 502);
  const body = await response.json();
  validateEnvelope(body, 502);
  assert.equal(body.error.code, 'INVALID_API_RESPONSE');
  assert.ok(!JSON.stringify(body).includes('storage details'));
});
test('locally owned media errors use the common envelope and fresh trace identifier', async () => {
  const first = ownedError(503, 'DEPENDENCY_UNAVAILABLE', 'The image is temporarily unavailable.');
  const second = ownedError(503, 'DEPENDENCY_UNAVAILABLE', 'The image is temporarily unavailable.');
  const body = await first.json();
  validateEnvelope(body, 503);
  assert.equal(body.traceId, first.headers.get('X-Trace-ID'));
  assert.notEqual(first.headers.get('X-Trace-ID'), second.headers.get('X-Trace-ID'));
});
