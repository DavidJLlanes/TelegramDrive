import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRecovery } from '../public/js/players/recovery.js';

class FakeAudio extends EventTarget {
  constructor() { super(); this.src = 'x'; this.currentTime = 42; this.paused = false; this.loads = 0; this.plays = 0; }
  load() { this.loads += 1; }
  play() { this.plays += 1; return Promise.resolve(); }
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

test('un error de carga recarga la pista y continúa desde donde iba', () => {
  const audio = new FakeAudio();
  const rec = createRecovery(audio);
  assert.equal(rec.onError(), true);
  assert.equal(audio.loads, 1);
  audio.currentTime = 0; // el navegador reinicia la posición al recargar
  audio.dispatchEvent(new Event('loadedmetadata'));
  assert.equal(audio.currentTime, 42);
  assert.equal(audio.plays, 1);
});

test('si estaba en pausa no se reanuda sola', () => {
  const audio = new FakeAudio(); audio.paused = true;
  const rec = createRecovery(audio);
  rec.onError(); audio.dispatchEvent(new Event('loadedmetadata'));
  assert.equal(audio.plays, 0);
});

test('tras 3 reintentos se rinde y reset() los devuelve a cero', () => {
  const audio = new FakeAudio();
  const rec = createRecovery(audio);
  assert.deepEqual([rec.onError(), rec.onError(), rec.onError(), rec.onError()], [true, true, true, false]);
  rec.reset();
  assert.equal(rec.onError(), true);
});

test('sin fuente no hay nada que recuperar', () => {
  const audio = new FakeAudio(); audio.src = '';
  assert.equal(createRecovery(audio).onError(), false);
});

test('un atasco prolongado reintenta; si la reproducción se reanuda, no', async () => {
  const stuck = new FakeAudio();
  createRecovery(stuck, { stallMs: 20 });
  stuck.dispatchEvent(new Event('waiting'));
  await wait(60);
  assert.equal(stuck.loads, 1);

  const fine = new FakeAudio();
  createRecovery(fine, { stallMs: 20 });
  fine.dispatchEvent(new Event('waiting'));
  fine.dispatchEvent(new Event('playing'));
  await wait(60);
  assert.equal(fine.loads, 0);
});
