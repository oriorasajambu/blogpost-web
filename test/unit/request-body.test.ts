import test from 'node:test';
import assert from 'node:assert/strict';
import { BffError } from '../../src/lib/bff-error';
import { readJsonBody, readLimitedBody } from '../../src/lib/request-body';

const streamRequest = (body: ReadableStream<Uint8Array>, headers?: HeadersInit) =>
  new Request('https://journal.example.test/api/editorial/posts', {
    method: 'POST',
    body,
    headers,
    duplex: 'half',
  } as RequestInit);
const hasStatus = (status: number) => (error: unknown) =>
  error instanceof BffError && error.status === status;

test('body limits count actual streamed bytes even when content length is absent or misleading', async () => {
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(4));
      controller.enqueue(new Uint8Array(4));
    },
    cancel() {
      cancelled = true;
    },
  });
  await assert.rejects(
    readLimitedBody(streamRequest(body, { 'Content-Length': '2' }), 6),
    hasStatus(413),
  );
  assert.equal(cancelled, true);
  await assert.rejects(
    readLimitedBody(
      new Request('https://journal.example.test', {
        method: 'POST',
        body: '12345',
        headers: { 'Content-Length': '5' },
      }),
      4,
    ),
    hasStatus(413),
  );
});

test('a stalled request expires and cancels its reader instead of keeping a proxy request open', async () => {
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    cancel() {
      cancelled = true;
    },
  });
  await assert.rejects(readLimitedBody(streamRequest(body), 1024, 10), hasStatus(408));
  assert.equal(cancelled, true);
});

test('bounded JSON preserves scalar content but rejects malformed UTF-8, nonobjects and excessive bytes', async () => {
  const request = (body: BodyInit) =>
    new Request('https://journal.example.test', { method: 'POST', body });
  assert.deepEqual(await readJsonBody(request('{"title":"A complete 😀"}')), {
    title: 'A complete 😀',
  });
  for (const body of ['null', '[]', '"text"', '{', new Uint8Array([0xff, 0xfe])])
    await assert.rejects(readJsonBody(request(body)), hasStatus(400));
  await assert.rejects(readJsonBody(request('{"large":"123456789"}'), 10), hasStatus(413));
});
