import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bandsFromSpectrum, goniometer } from '../public/js/features/scope/bands.js';
import { MODES } from '../public/js/features/scope/modes.js';

test('bandas: cantidad pedida, valores 0-1 y silencio = 0', () => {
  const loud = bandsFromSpectrum(new Uint8Array(1024).fill(255), 32, 1);
  assert.equal(loud.length, 32); assert.ok(loud.every((v) => v > 0 && v <= 1));
  assert.ok(bandsFromSpectrum(new Uint8Array(1024), 32, 2).every((v) => v === 0));
});

test('bandas: la sensibilidad escala y satura en 1', () => {
  const half = new Uint8Array(1024).fill(100);
  const low = bandsFromSpectrum(half, 16, 1); const high = bandsFromSpectrum(half, 16, 3);
  assert.ok(high.every((v, i) => v >= low[i] && v <= 1));
});

test('bandas: un pico grave cae en las primeras bandas', () => {
  const freq = new Uint8Array(1024); freq[2] = 255; freq[3] = 255;
  const bands = bandsFromSpectrum(freq, 24, 4);
  assert.ok(bands[0] > 0 || bands[1] > 0); assert.equal(bands[20], 0);
});

test('goniómetro: mono = línea vertical, solo un canal = diagonal, ejes en -1..1', () => {
  const [x, y] = goniometer(255, 255); assert.ok(Math.abs(x) < 1e-9 && y > 1);
  const [x2, y2] = goniometer(255, 128); assert.ok(x2 > 0 && y2 > 0);
  assert.deepEqual(goniometer(128, 128), [0, 0]);
});

test('hay exactamente 5 modos con nombre', () => {
  assert.equal(MODES.length, 5); assert.ok(MODES.every(([id, label]) => id && label));
});
