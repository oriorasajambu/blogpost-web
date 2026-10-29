import test from 'node:test';
import assert from 'node:assert/strict';
import { searchQuery } from '../../src/lib/reading-input';

test('search preserves a full 200-scalar query ending with an astral character', () => {
  const value = 'a'.repeat(199) + '😀';
  const query = searchQuery(value);
  assert.equal(query.value, value);
  assert.equal(query.value.isWellFormed(), true);
  assert.equal(query.feedback, undefined);
  assert.equal(searchQuery('😀'.repeat(200)).feedback, undefined);
});

test('overlong search text remains editable and receives feedback rather than silent truncation', () => {
  for (const value of ['a'.repeat(201), '😀'.repeat(201)]) {
    const query = searchQuery(value);
    assert.equal(query.value, value);
    assert.equal(query.feedback, 'Use a search query with 200 characters or fewer.');
  }
});

test('search rejects ambiguous or malformed input and treats whitespace as an empty query', () => {
  assert.equal(searchQuery(['one', 'two']).feedback, 'Use one search query at a time.');
  assert.ok(searchQuery('broken\ud83d').feedback);
  assert.deepEqual(searchQuery(' \n\t '), { value: '', feedback: undefined });
  assert.deepEqual(searchQuery(undefined), { value: '', feedback: undefined });
});
