import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLevels, BANDS } from '../public/js/features/eq-bars/levels.js';

const spectrum = (fill) => { const f = new Uint8Array(512); for (const [from, to, v] of fill) f.fill(v, from, to); return f; };

test('cada barra responde solo a su banda: un bombo mueve la primera, un platillo la tercera', () => {
  const levels = createLevels();
  for (let i = 0; i < 20; i += 1) levels(spectrum([[BANDS[0][0], BANDS[0][1], 220], [BANDS[2][0], BANDS[2][1], 20]]));
  const kick = levels(spectrum([[BANDS[0][0], BANDS[0][1], 220]]));
  assert.ok(kick[0] > 0.9 && kick[1] < 0.2 && kick[2] < 0.2, `bombo: ${kick}`);
  const hat = levels(spectrum([[BANDS[2][0], BANDS[2][1], 200]]));
  assert.ok(hat[2] > hat[0] && hat[2] > hat[1], `platillo: ${hat}`);
});

test('con silencio las tres barras bajan, y los niveles siempre están entre 0 y 1', () => {
  const levels = createLevels();
  for (const v of levels(new Uint8Array(512))) assert.ok(v >= 0 && v <= 1 && v < 0.05);
  for (const v of levels(new Uint8Array(512).fill(255))) assert.ok(v >= 0 && v <= 1);
});
