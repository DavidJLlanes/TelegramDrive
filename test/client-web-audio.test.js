import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGraph } from '../public/js/players/web-audio.js';

const node = (name) => ({ name, out: [], connect(n) { this.out.push(n.name); }, disconnect() { this.out = []; } });
const dest = node('destino');

test('sin insertos: fuente → destino', () => {
  const source = node('fuente');
  createGraph({ destination: dest }, source);
  assert.deepEqual(source.out, ['destino']);
});

test('los insertos se encadenan y las tomas escuchan la última salida', () => {
  const source = node('fuente'); const f1 = node('f1'); const f2 = node('f2'); const tap = node('analizador');
  const graph = createGraph({ destination: dest }, source);
  graph.setInserts('eq', [f1, f2]);
  graph.addTap(tap);
  assert.deepEqual(source.out, ['f1']); assert.deepEqual(f1.out, ['f2']); assert.deepEqual(f2.out, ['destino', 'analizador']);
  graph.removeTap(tap);
  assert.deepEqual(f2.out, ['destino']);
  graph.setInserts('eq', null);
  assert.deepEqual(source.out, ['destino']); assert.deepEqual(f1.out, []);
});

test('una toma sin ecualizador cuelga directamente de la fuente', () => {
  const source = node('fuente'); const tap = node('analizador');
  const graph = createGraph({ destination: dest }, source);
  graph.addTap(tap);
  assert.deepEqual(source.out, ['destino', 'analizador']);
});
