import assert from 'node:assert/strict';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { draftHistoryGuardScript } from '../../src/lib/draft-history-guard';

test('head history guard lets a later-mounted editor stop the router listener before a failed exit', () => {
  const window = new EventTarget();
  runInNewContext(draftHistoryGuardScript, { window, CustomEvent });
  let routerRestored = false;
  window.addEventListener('popstate', () => {
    routerRestored = true;
  });
  let received: Event | undefined;
  window.addEventListener('blogpost:before-history', (event) => {
    received = (event as CustomEvent<Event>).detail;
    received.stopImmediatePropagation();
  });
  const traversal = new Event('popstate');
  window.dispatchEvent(traversal);
  assert.equal(received, traversal);
  assert.equal(routerRestored, false);
});
test('ordinary history continues when no editor needs to intercept', () => {
  const window = new EventTarget();
  runInNewContext(draftHistoryGuardScript, { window, CustomEvent });
  let restored = 0;
  window.addEventListener('popstate', () => {
    restored++;
  });
  window.dispatchEvent(new Event('popstate'));
  assert.equal(restored, 1);
});
