import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fadeGain } from '../public/js/features/audio-fx/fade.js';
import { sanitize, DEFAULTS } from '../public/js/features/audio-fx/settings.js';
import { PRESETS, BANDS, clampGain } from '../public/js/features/audio-fx/presets.js';

test('fadeGain: sube al empezar, baja al acabar, pleno en medio', () => {
  assert.equal(fadeGain(0, 200, 4), 0);
  assert.equal(fadeGain(2, 200, 4), 0.5);
  assert.equal(fadeGain(100, 200, 4), 1);
  assert.equal(fadeGain(198, 200, 4), 0.5);
  assert.equal(fadeGain(200, 200, 4), 0);
});
test('fadeGain: desactivado, duración desconocida o pista muy corta', () => {
  assert.equal(fadeGain(1, 200, 0), 1);
  assert.equal(fadeGain(1, NaN, 4), 1);
  assert.equal(fadeGain(1, Infinity, 4), 1);
  assert.equal(fadeGain(3, 6, 6), 1); // el tramo se limita a la mitad de la pista
});
test('sanitize recupera de datos corruptos', () => {
  assert.deepEqual(sanitize(null), DEFAULTS);
  assert.deepEqual(sanitize({ eq: 'sí', preset: 'x', gains: [1, 2], fade: 3 }), DEFAULTS);
  const ok = sanitize({ eq: true, preset: 'rock', gains: [50, -50, 3, 0, 1], fade: 4 });
  assert.deepEqual(ok, { eq: true, preset: 'rock', gains: [12, -12, 3, 0, 1], fade: 4 });
});
test('cada preajuste tiene una ganancia por banda y dentro de rango', () => {
  for (const p of Object.values(PRESETS)) { assert.equal(p.gains.length, BANDS.length); p.gains.forEach((g) => assert.equal(clampGain(g), g)); }
});
