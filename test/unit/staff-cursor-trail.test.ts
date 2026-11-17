import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advance,
  NEWEST,
  parseTrail,
  position,
  trailKey,
} from '../../src/features/staff/cursor-trail';

test('forward paging from the newest page records a numbered trail', () => {
  let trail: string[] = [NEWEST];
  trail = advance(trail, NEWEST, 'c1');
  trail = advance(trail, 'c1', 'c2');
  assert.deepEqual(trail, [NEWEST, 'c1', 'c2']);
  assert.deepEqual(position(trail, 'c2'), {
    index: 2,
    pageNumber: 3,
    previous: 'c1',
    canReturnToNewest: true,
  });
  assert.equal(position(trail, 'c1').previous, NEWEST);
  assert.deepEqual(position(trail, NEWEST), {
    index: 0,
    pageNumber: 1,
    previous: null,
    canReturnToNewest: false,
  });
});

test('browser Back to an earlier page then Next forks the trail without stale entries', () => {
  const trail = [NEWEST, 'c1', 'c2', 'c3'];
  // The URL moved back to c1 without the hook being told; position follows the URL.
  assert.equal(position(trail, 'c1').pageNumber, 2);
  assert.deepEqual(advance(trail, 'c1', 'x2'), [NEWEST, 'c1', 'x2']);
  // Re-opening the same next page keeps the trail unchanged.
  assert.deepEqual(advance(trail, 'c1', 'c1'), trail);
});

test('a shared or reloaded cursor has no known previous page or number', () => {
  const unknown = position([NEWEST], 'shared');
  assert.deepEqual(unknown, {
    index: -1,
    pageNumber: null,
    previous: null,
    canReturnToNewest: true,
  });
  const trail = advance([NEWEST], 'shared', 'after');
  assert.deepEqual(trail, ['shared', 'after']);
  assert.deepEqual(position(trail, 'after'), {
    index: 1,
    pageNumber: null,
    previous: 'shared',
    canReturnToNewest: true,
  });
});

test('trail keys ignore empty filters and filter order', () => {
  assert.equal(
    trailKey('audit', { action: 'X', subjectType: '', subjectId: 'a' }),
    trailKey('audit', { subjectId: 'a', action: 'X' }),
  );
  assert.notEqual(trailKey('audit', { action: 'X' }), trailKey('member', { action: 'X' }));
  assert.equal(trailKey('member', {}), 'staff-pager:member:');
});

test('stored trails are validated before use', () => {
  assert.deepEqual(parseTrail(null), [NEWEST]);
  assert.deepEqual(parseTrail('not json'), [NEWEST]);
  assert.deepEqual(parseTrail('[]'), [NEWEST]);
  assert.deepEqual(parseTrail('[1,2]'), [NEWEST]);
  assert.deepEqual(parseTrail(JSON.stringify(['x'.repeat(2049)])), [NEWEST]);
  assert.deepEqual(parseTrail(JSON.stringify(['', 'c1'])), ['', 'c1']);
});
