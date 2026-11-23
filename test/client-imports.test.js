// Cada import del cliente apunta a un fichero que existe y que exporta los nombres pedidos
// (un import roto deja la app en blanco en el navegador y no lo detecta ningún otro test).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = new URL('../public/', import.meta.url).pathname;
const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'vendor') walk(p); } else if (p.endsWith('.js')) files.push(p);
  }
})(root);

const exportsOf = new Map();
function exported(file) {
  if (exportsOf.has(file)) return exportsOf.get(file);
  const src = fs.readFileSync(file, 'utf8');
  const names = new Set();
  for (const m of src.matchAll(/export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+([\w$]+)/g)) names.add(m[1]);
  for (const m of src.matchAll(/export\s*\{([^}]*)\}/g)) m[1].split(',').map((s) => s.trim().split(/\s+as\s+/).pop()).filter(Boolean).forEach((n) => names.add(n));
  if (/export\s+default\b/.test(src)) names.add('default');
  exportsOf.set(file, names);
  return names;
}

test('todos los imports relativos del cliente existen y exportan lo que se importa', () => {
  const problems = [];
  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8');
    for (const m of src.matchAll(/import\s+(?:([\w$]+)\s*,?\s*)?(?:\{([^}]*)\})?\s*(?:from\s*)?['"](\.{1,2}\/[^'"]+)['"]/g)) {
      const target = path.resolve(path.dirname(file), m[3]);
      const rel = path.relative(root, file);
      if (!fs.existsSync(target)) { problems.push(`${rel}: no existe ${m[3]}`); continue; }
      const names = exported(target);
      if (m[1] && !names.has('default')) problems.push(`${rel}: ${m[3]} no tiene export default`);
      for (const n of (m[2] ?? '').split(',').map((s) => s.trim().split(/\s+as\s+/)[0]).filter(Boolean)) {
        if (!names.has(n)) problems.push(`${rel}: ${m[3]} no exporta «${n}»`);
      }
    }
  }
  assert.deepEqual(problems, []);
});

test('index.html solo enlaza hojas de estilo y scripts que existen', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const missing = [...html.matchAll(/(?:href|src)="([^"#:]+\.(?:css|js))"/g)].map((m) => m[1]).filter((p) => !fs.existsSync(path.join(root, p)));
  assert.deepEqual(missing, []);
});
