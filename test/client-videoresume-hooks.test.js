import { test } from 'node:test';
import assert from 'node:assert/strict';

const mem = new Map();
globalThis.localStorage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) };
globalThis.document = { body: { append() {} }, createElement: () => ({ addEventListener() {}, append() {}, classList: { add() {}, remove() {} }, style: {}, setAttribute() {}, remove() {} }), createTextNode: (t) => t, querySelector: () => null };
const { onVideoLoad, emitVideoLoad } = await import('../public/js/players/video-hooks.js');
await import('../public/js/features/video-resume/index.js');
const { getPosition } = await import('../public/js/features/video-resume/store.js');

/** <video> simulado: EventTarget con las propiedades que lee la función. */
function fakeVideo() {
  const v = new EventTarget();
  Object.assign(v, { readyState: 4, duration: 3600, currentTime: 0 });
  return v;
}

test('al pasar al siguiente vídeo, el anterior conserva su posición y el nuevo no la pisa', () => {
  const v = fakeVideo();
  emitVideoLoad(v, { id: 1 });
  v.currentTime = 300; v.dispatchEvent(new Event('timeupdate'));
  emitVideoLoad(v, { id: 2 });         // mismo <video>, otro archivo
  v.readyState = 0; v.currentTime = 0;  // src nuevo: aún sin cargar
  v.readyState = 4; v.currentTime = 50; v.dispatchEvent(new Event('timeupdate')); v.dispatchEvent(new Event('pause'));
  assert.equal(getPosition(1), 300);
  assert.equal(getPosition(2), 50 >= 15 ? 50 : 0);
});

test('cerrar el reproductor (se descarga el vídeo antes del evento pause) no borra la posición', () => {
  const v = fakeVideo();
  emitVideoLoad(v, { id: 3 });
  v.currentTime = 900; v.dispatchEvent(new Event('timeupdate'));
  v.readyState = 0; v.currentTime = 0; v.duration = NaN; // load() tras removeAttribute('src')
  v.dispatchEvent(new Event('pause'));
  assert.equal(getPosition(3), 900);
});

test('al terminar el vídeo se olvida la posición', () => {
  const v = fakeVideo();
  emitVideoLoad(v, { id: 4 });
  v.currentTime = 1000; v.dispatchEvent(new Event('timeupdate')); v.dispatchEvent(new Event('pause'));
  assert.equal(getPosition(4), 1000);
  v.currentTime = 3600; v.dispatchEvent(new Event('ended'));
  assert.equal(getPosition(4), 0);
});
