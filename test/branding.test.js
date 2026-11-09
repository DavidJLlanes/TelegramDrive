import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeHarness } from './helpers/harness.js';

let h;
before(async () => { h = await makeHarness(); });
after(() => h.close());

const pub = path.resolve('public');

test('el manifest y el HTML solo enlazan iconos que existen', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(pub, 'manifest.webmanifest'), 'utf8'));
  const html = fs.readFileSync(path.join(pub, 'index.html'), 'utf8');
  const refs = [...manifest.icons.map((i) => i.src), ...[...html.matchAll(/href="(icons\/[^"]+)"/g)].map((m) => m[1])];
  assert.ok(refs.length >= 12);
  for (const ref of refs) assert.ok(fs.existsSync(path.join(pub, ref)), `falta ${ref}`);
  assert.ok(manifest.icons.some((i) => i.purpose === 'maskable' && i.sizes === '512x512'));
  assert.ok(fs.existsSync(path.join(pub, 'og-image.png')));
});

test('la portada sirve las metaetiquetas Open Graph con URL absoluta y el prefijo de la app', async () => {
  const r = await fetch(`${h.base}/`, { headers: { 'x-forwarded-proto': 'https', host: 'ejemplo.es' } });
  const html = await r.text();
  assert.equal(r.status, 200);
  assert.ok(!html.includes('__ORIGIN__'));
  assert.match(html, /property="og:image" content="https?:\/\/[^"]+\/og-image\.png"/);
});

test('el service worker no precachea la imagen social ni los iconos grandes', async () => {
  const sw = await (await fetch(`${h.base}/sw.js`)).text();
  assert.ok(!sw.includes('og-image.png') && !sw.includes('icon-512.png') && !sw.includes('icon-maskable'));
  assert.ok(sw.includes('icons/apple-touch-icon.png'));
});
