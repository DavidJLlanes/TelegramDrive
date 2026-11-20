import { test } from 'node:test';
import assert from 'node:assert/strict';
import { playlistPage, PAGE_SIZE } from '../server/features/music-downloads/playlist-page.js';

test('paginación estable de listas grandes', () => {
  assert.equal(PAGE_SIZE, 50);
  assert.deepEqual(playlistPage(0), { offset: 0, start: 1, end: 50, nextOffset: 50, previousOffset: null });
  assert.equal(playlistPage(50).previousOffset, 0);
  assert.equal(playlistPage(4950).nextOffset, null);
});
test('no acepta offsets negativos, fraccionarios ni enormes', () => {
  for (const offset of [-1, 1, 49, 5000, 999999, 'x', 1.5]) {
    assert.throws(() => playlistPage(offset));
  }
});
