import assert from 'node:assert/strict';
import test from 'node:test';
import { emptyDraftContent } from '../../src/features/editor/draft-model';
import { validateEditorContent } from '../../src/features/editor/editor-validation';

const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
test('editor validation recognizes informative, decorative, and reference images without inspecting code examples', () => {
  for (const markdown of [
    `![A diagram](media://${id})`,
    `![](media://${id} "decorative")`,
    `![A diagram][diagram]\n\n[diagram]: media://${id}`,
    '```md\n![](https://example.com/image.png)\n```',
    '`![](javascript:bad)`',
  ])
    assert.deepEqual(validateEditorContent({ ...emptyDraftContent(), markdown }), []);
});
test('editor validation rejects external images and missing alt text while retaining source for device saving', () => {
  assert.match(
    validateEditorContent({ ...emptyDraftContent(), markdown: `![](media://${id})` }).join(' '),
    /alternative text/,
  );
  assert.match(
    validateEditorContent({
      ...emptyDraftContent(),
      markdown: '![A diagram](https://example.com/image.png)',
    }).join(' '),
    /media:\/\//,
  );
});
test('editor limits count Unicode scalars and UTF-8 bytes independently', () => {
  assert.deepEqual(validateEditorContent({ ...emptyDraftContent(), title: '😀'.repeat(160) }), []);
  assert.match(
    validateEditorContent({ ...emptyDraftContent(), title: '😀'.repeat(161) }).join(' '),
    /160/,
  );
  assert.match(
    validateEditorContent({ ...emptyDraftContent(), markdown: '😀'.repeat(32769) }).join(' '),
    /128 KiB/,
  );
});
