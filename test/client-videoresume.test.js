import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const mem = new Map();
globalThis.localStorage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) };
const { savePosition, getPosition, resumePoint } = await import('../public/js/features/video-resume/store.js');
beforeEach(() => mem.clear());

test('guarda y recupera la posición', () => {
  savePosition(7, 125.8, 3600);
  assert.equal(getPosition(7), 125);
  assert.equal(resumePoint(7, 3600), 125);
});
test('no guarda el principio ni el final (y borra lo anterior)', () => {
  savePosition(1, 300, 3600);
  savePosition(1, 5, 3600);
  assert.equal(getPosition(1), 0);
  savePosition(2, 500, 3600);
  savePosition(2, 3590, 3600);
  assert.equal(getPosition(2), 0);
});
test('un vídeo de duración desconocida no se guarda', () => {
  savePosition(3, 500, NaN);
  assert.equal(getPosition(3), 0);
});
test('conserva solo los 200 más recientes', () => {
  for (let i = 1; i <= 205; i += 1) savePosition(i, 100, 1000, i);
  assert.equal(getPosition(1), 0);
  assert.equal(getPosition(205), 100);
  assert.equal(Object.keys(JSON.parse(mem.get('tgd.videopos'))).length, 200);
});
test('datos corruptos no rompen', () => {
  mem.set('tgd.videopos', '[1,2');
  assert.equal(getPosition(1), 0);
  savePosition(1, 100, 1000);
  assert.equal(getPosition(1), 100);
});
