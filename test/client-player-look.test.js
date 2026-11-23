import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLrc, activeLine } from '../public/js/core/lrc.js';
import { dominantHue, oklchHue } from '../public/js/core/cover-color.js';
import { peaksFromChannel } from '../public/js/features/waveform/peaks.js';

test('LRC: lee marcas, ignora metadatos y ordena', () => {
  const { synced, lines } = parseLrc('[ar:Alguien]\n[00:12.50]Segunda\n[00:01.00]Primera\n[01:02]Tercera');
  assert.equal(synced, true);
  assert.deepEqual(lines.map((l) => [l.t, l.text]), [[1, 'Primera'], [12.5, 'Segunda'], [62, 'Tercera']]);
});

test('LRC: una línea con varias marcas se repite; sin marcas no hay sincronía', () => {
  assert.equal(parseLrc('[00:05.00][00:30.00]Estribillo').lines.length, 2);
  const plain = parseLrc('Hola\nmundo');
  assert.equal(plain.synced, false); assert.equal(plain.lines.length, 2);
});

test('activeLine: busca la línea que suena', () => {
  const { lines } = parseLrc('[00:05]a\n[00:10]b\n[00:20]c');
  assert.deepEqual([0, 5, 9.9, 10, 25].map((t) => activeLine(lines, t)), [-1, 0, 0, 1, 2]);
});

const pixels = (rgb, n = 100) => Uint8ClampedArray.from({ length: n * 4 }, (_, i) => (i % 4 === 3 ? 255 : rgb[i % 4]));

test('color dominante: rojo y azul dan tonos distintos y el gris, nada', () => {
  const red = dominantHue(pixels([220, 30, 30]), 1); const blue = dominantHue(pixels([30, 60, 220]), 1);
  assert.ok(red < 50 || red > 340, `rojo: ${red}`); assert.ok(blue > 240 && blue < 285, `azul: ${blue}`);
  assert.equal(dominantHue(pixels([128, 128, 128]), 1), null);
  assert.equal(dominantHue(pixels([5, 5, 5]), 1), null);
});

test('oklchHue de colores primarios', () => {
  assert.ok(Math.abs(oklchHue(255, 0, 0) - 29) < 2); assert.ok(Math.abs(oklchHue(0, 0, 255) - 264) < 2);
});

test('picos: normaliza al máximo y respeta la cantidad', () => {
  const samples = Float32Array.from({ length: 1000 }, (_, i) => (i < 500 ? 0.1 : 0.8) * Math.sin(i));
  const peaks = peaksFromChannel(samples, 10);
  assert.equal(peaks.length, 10); assert.equal(Math.max(...peaks), 255);
  assert.ok(peaks[0] < peaks[9]);
  assert.deepEqual(peaksFromChannel(new Float32Array(100), 4), [0, 0, 0, 0]);
});
