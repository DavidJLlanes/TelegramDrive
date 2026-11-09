import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createQueue } from '../public/js/players/audio-queue.js';

const files = (n) => Array.from({ length: n }, (_, i) => ({ id: i + 1 }));
const drain = (q) => { const out = [q.current().id]; for (let f = q.next(); f; f = q.next()) out.push(f.id); return out; };

test('cola en orden: avanza, retrocede y termina', () => {
  const q = createQueue();
  q.set(files(3), 2);
  assert.equal(q.current().id, 2);
  assert.equal(q.next().id, 3);
  assert.equal(q.next(), null);
  assert.equal(q.prev().id, 2);
});

test('aleatorio: empieza por la pista elegida y recorre todas sin repetir', () => {
  const q = createQueue();
  q.set(files(20), 7, { shuffle: true });
  assert.equal(q.current().id, 7);
  const all = drain(q);
  assert.equal(all.length, 20);
  assert.equal(new Set(all).size, 20);
});

test('repetir todo vuelve al principio; repetir una mantiene la pista al terminar', () => {
  const q = createQueue();
  q.set(files(2), 2);
  q.cycleRepeat();                       // all
  assert.equal(q.next().id, 1);
  q.cycleRepeat();                       // one
  assert.equal(q.next(true).id, 1);      // fin de pista: se repite
  assert.equal(q.next().id, 2);          // botón "siguiente": avanza
});

test('extend conserva la pista actual al ampliar la lista', () => {
  const q = createQueue();
  q.set(files(2), 2);
  assert.equal(q.extend(files(10)), true);
  assert.equal(q.current().id, 2);
  assert.equal(q.next().id, 3);
  assert.equal(q.extend([{ id: 99 }]), false);
});

test('activar el aleatorio a mitad no cambia la pista actual', () => {
  const q = createQueue();
  q.set(files(10), 4);
  q.toggleShuffle();
  assert.equal(q.current().id, 4);
  q.toggleShuffle();
  assert.equal(q.current().id, 4);
  assert.equal(q.next().id, 5);
});
