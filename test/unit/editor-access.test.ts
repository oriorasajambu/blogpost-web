import test from 'node:test';
import assert from 'node:assert/strict';
import { EditorApiError } from '../../src/features/editor/editor-api';

test('a CSRF check failure does not report lost staff access; other 403s and 401s still do', async () => {
  const events: string[] = [];
  const target = new EventTarget();
  for (const name of ['blogpost:staff-access-lost', 'blogpost:staff-session-expired'])
    target.addEventListener(name, () => events.push(name));
  Object.defineProperty(globalThis, 'window', { value: target, configurable: true });
  try {
    const { notifyEditorAccess } = await import('../../src/features/editor/use-durable-draft');
    notifyEditorAccess(new EditorApiError('CSRF_VALIDATION_FAILED', 403));
    assert.deepEqual(events, []);
    notifyEditorAccess(new EditorApiError('FORBIDDEN', 403));
    notifyEditorAccess(new EditorApiError('UNAUTHENTICATED', 401));
    assert.deepEqual(events, ['blogpost:staff-access-lost', 'blogpost:staff-session-expired']);
  } finally {
    Reflect.deleteProperty(globalThis, 'window');
  }
});
