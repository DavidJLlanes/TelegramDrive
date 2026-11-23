import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FOLDER_ICONS as serverIcons, parseColor } from '../server/utils/folder-style.js';
import { FOLDER_ICONS as clientIcons, FOLDER_COLORS } from '../public/js/ui/folder-styles-data.js';
import { readFileSync } from 'node:fs';

test('los iconos del cliente coinciden con los que acepta el servidor', () => {
  const client = clientIcons.map(([value]) => value).filter(Boolean);
  assert.deepEqual([...client].sort(), [...serverIcons].sort());
});

test('cada icono elegible tiene dibujo SVG definido', () => {
  const src = readFileSync(new URL('../public/js/core/icons.js', import.meta.url), 'utf8')
    + readFileSync(new URL('../public/js/core/icons-folder.js', import.meta.url), 'utf8');
  for (const name of serverIcons) assert.match(src, new RegExp(`\\b${name}: '`), `falta el icono ${name}`);
});

test('los colores de la paleta son tonos válidos y distintos', () => {
  const hues = FOLDER_COLORS.map((c) => c.hue);
  assert.equal(new Set(hues).size, hues.length);
  for (const hue of hues) assert.equal(parseColor(hue), hue);
});
