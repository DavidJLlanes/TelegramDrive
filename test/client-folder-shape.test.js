import { test } from 'node:test';
import assert from 'node:assert/strict';
import { folderPath, TAB_W, TAB_H } from '../public/js/ui/folder-shape.js';

const numbers = (d) => d.replace(/[A-Z]/g, ' ').split(/\s+/).filter(Boolean).map(Number);

test('la silueta es un trazado cerrado, sin valores no numéricos, y respeta el tamaño pedido', () => {
  for (const [w, h] of [[228, 158], [330, 229], [180, 125]]) {
    const d = folderPath(w, h);
    assert.match(d, /^M .* Z$/);
    assert.ok(numbers(d).every(Number.isFinite), d);
    assert.ok(numbers(d).every((n) => n >= 0 && n <= Math.max(w, h)), `fuera del recuadro: ${d}`);
  }
});

test('la pestaña mide lo mismo a cualquier ancho y el cuerpo arranca TAB_H por debajo', () => {
  for (const w of [180, 228, 330]) {
    const d = folderPath(w, 150);
    assert.ok(d.includes(`L ${TAB_W - 6} 0`), "arista superior de la pestaña");
    assert.ok(d.includes(`L ${w - 16} ${TAB_H}`), 'arista superior del cuerpo');
  }
});

test('el trazo (inset) queda dentro de la silueta de recorte', () => {
  const [wanted, inner] = [numbers(folderPath(228, 158)), numbers(folderPath(228, 158, 0.75))];
  assert.ok(Math.max(...inner) <= Math.max(...wanted) && Math.min(...inner.filter((n) => n > 0)) >= 0);
});
