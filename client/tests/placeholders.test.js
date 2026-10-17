// Run with:  cd client && npm test     (uses Node's built-in test runner, no extra packages)
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractPlaceholders,
  fillTemplate,
  segmentTemplate,
  missingKeys,
  labelFor,
  pruneValues
} from '../src/utils/placeholders.js';

const T = 'Explain {{topic}} to a {{year_of_study}} student using {{difficulty_level}} language. Recap {{topic}} at the end.';

test('detects unique placeholders in order, counting repeats', () => {
  assert.deepEqual(extractPlaceholders(T), [
    { key: 'topic', count: 2 },
    { key: 'year_of_study', count: 1 },
    { key: 'difficulty_level', count: 1 }
  ]);
});

test('ignores spaces inside braces and treats them as the same key', () => {
  assert.deepEqual(extractPlaceholders('{{ topic }} and {{topic}}'), [{ key: 'topic', count: 2 }]);
});

test('ignores things that are not placeholders', () => {
  assert.deepEqual(extractPlaceholders('{single} {{}} {{1abc}} { {x} } {{ }}'), []);
  assert.deepEqual(extractPlaceholders(''), []);
  assert.deepEqual(extractPlaceholders(null), []);
});

test('fills every occurrence of a repeated placeholder', () => {
  const out = fillTemplate(T, { topic: 'B-trees', year_of_study: 'second-year', difficulty_level: 'simple' });
  assert.equal(out, 'Explain B-trees to a second-year student using simple language. Recap B-trees at the end.');
});

test('leaves missing or blank values as visible placeholders', () => {
  const out = fillTemplate(T, { topic: 'Joins', year_of_study: '   ' });
  assert.equal(out, 'Explain Joins to a {{year_of_study}} student using {{difficulty_level}} language. Recap Joins at the end.');
});

test('values containing $ or braces are inserted literally', () => {
  assert.equal(fillTemplate('Cost: {{price}}', { price: '$1 {{x}} $&' }), 'Cost: $1 {{x}} $&');
});

test('does not change the original template string', () => {
  const original = String(T);
  fillTemplate(T, { topic: 'X' });
  assert.equal(T, original);
});

test('segments mark filled and missing slots', () => {
  const segs = segmentTemplate('Hi {{name}}, {{day}}!', { name: 'Asha' });
  assert.deepEqual(segs, [
    { type: 'text', text: 'Hi ' },
    { type: 'slot', key: 'name', value: 'Asha', filled: true },
    { type: 'text', text: ', ' },
    { type: 'slot', key: 'day', value: '{{day}}', filled: false },
    { type: 'text', text: '!' }
  ]);
});

test('missingKeys lists unfilled placeholders', () => {
  const ph = extractPlaceholders(T);
  assert.deepEqual(missingKeys(ph, { topic: 'x' }), ['year_of_study', 'difficulty_level']);
});

test('labels are human readable', () => {
  assert.equal(labelFor('year_of_study'), 'Year of study');
  assert.equal(labelFor('target-fps'), 'Target fps');
  assert.equal(labelFor('gpuModel'), 'Gpu Model');
});

test('pruneValues drops keys that no longer exist', () => {
  assert.deepEqual(pruneValues([{ key: 'a', count: 1 }], { a: '1', b: '2' }), { a: '1' });
});
