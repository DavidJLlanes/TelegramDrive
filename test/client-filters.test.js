import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matches, filterFiles, isActive, DEFAULT_FILTERS } from '../public/js/features/filters/predicates.js';

const now = Date.UTC(2026, 10, 9);
const day = 86400000;
const files = [
  { name: 'a.jpg', kind: 'image', size: 500_000, date: now - 2 * day },
  { name: 'b.mp4', kind: 'video', size: 300 * 1048576, date: now - 40 * day },
  { name: 'c.pdf', kind: 'file', size: 5 * 1048576, date: now - 400 * day },
  { name: 'd.mp3', kind: 'audio', size: 1048576, date: now },
];
const names = (f) => filterFiles(files, { ...DEFAULT_FILTERS, ...f }, now).map((x) => x.name);

test('sin filtros devuelve la misma lista', () => {
  assert.equal(isActive(DEFAULT_FILTERS), false);
  assert.equal(filterFiles(files, DEFAULT_FILTERS, now), files);
});
test('por tipo', () => assert.deepEqual(names({ kind: 'video' }), ['b.mp4']));
test('por fecha', () => {
  assert.deepEqual(names({ date: 'week' }), ['a.jpg', 'd.mp3']);
  assert.deepEqual(names({ date: 'year' }), ['a.jpg', 'b.mp4', 'd.mp3']);
});
test('por tamaño (1 MB cuenta como mediano)', () => {
  assert.deepEqual(names({ size: 'small' }), ['a.jpg']);
  assert.deepEqual(names({ size: 'medium' }), ['c.pdf', 'd.mp3']);
  assert.deepEqual(names({ size: 'large' }), ['b.mp4']);
});
test('se combinan', () => {
  assert.deepEqual(names({ kind: 'audio', date: 'day', size: 'medium' }), ['d.mp3']);
  assert.equal(matches(files[0], { kind: 'audio', date: 'any', size: 'any' }, now), false);
});
