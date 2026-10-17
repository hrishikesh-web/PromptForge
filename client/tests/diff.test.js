import test from 'node:test';
import assert from 'node:assert/strict';
import { diffLines, diffStats } from '../src/utils/diff.js';

test('identical texts have no changes', () => {
  const d = diffLines('a\nb', 'a\nb');
  assert.deepEqual(diffStats(d), { added: 0, removed: 0 });
  assert.equal(d.length, 2);
});

test('detects an added line in the middle', () => {
  const d = diffLines('a\nc', 'a\nb\nc');
  assert.deepEqual(d, [
    { type: 'same', text: 'a' },
    { type: 'added', text: 'b' },
    { type: 'same', text: 'c' }
  ]);
});

test('detects a changed line as removed + added', () => {
  const d = diffLines('Use only the material.', 'Use only the attached material.');
  assert.deepEqual(diffStats(d), { added: 1, removed: 1 });
});

test('handles empty old version', () => {
  assert.deepEqual(diffStats(diffLines('', 'x\ny')), { added: 2, removed: 0 });
});
