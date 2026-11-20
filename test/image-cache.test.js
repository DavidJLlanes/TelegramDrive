import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeHarness } from './helpers/harness.js';

let h; let call; let sharp; let source; let id;
const present = (p) => fs.existsSync(p);

before(async () => {
  h = await makeHarness(); call = h.call; await h.login();
  sharp = await import('sharp').then((m) => m.default).catch(() => null);
  await call('POST', '/api/folders', { parent: '/', name: 'Suki' });
  await call('POST', '/api/folders', { parent: '/Suki', name: 'Vacaciones' });
  if (sharp) {
    source = await sharp({ create: { width: 128, height: 96, channels: 3, background: '#b15522' } }).jpeg().toBuffer();
    id = h.tg.addFile({ folder: h.catalog.tree.resolve('/Suki/Vacaciones'), name: 'retrato.jpg', bytes: source }).id;
    await call('POST', '/api/refresh'); await h.waitSync();
  }
});
after(() => h?.close());

test('las vistas previas están protegidas por la sesión', async () => {
  assert.equal((await fetch(h.base + '/api/files/123/preview')).status, 401);
});

test('caché WebP por carpetas y descarga del original intacto', async (t) => {
  if (!sharp) return t.skip('sharp no está instalado en este entorno');
  for (const kind of ['thumb', 'preview']) {
    const response = await h.raw('/api/files/' + id + '/' + kind);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /image\/webp/);
    assert.equal(Buffer.from(await response.arrayBuffer()).subarray(8, 12).toString(), 'WEBP');
    const where = path.join(h.dataDir, kind === 'thumb' ? 'thumbs' : 'previews', 'Suki', 'Vacaciones', id + '.webp');
    assert.equal(present(where), true);
  }
  const original = await h.raw('/api/files/' + id + '/content?download=1');
  assert.deepEqual(Buffer.from(await original.arrayBuffer()), source);
});

test('renombrar carpetas y mover archivos mantiene las dos cachés', async (t) => {
  if (!sharp) return t.skip('sharp no está instalado en este entorno');
  const renamed = await call('PATCH', '/api/folders', { path: '/Suki/Vacaciones', name: 'Retratos' });
  assert.equal(renamed.res.status, 200);
  for (const root of ['thumbs', 'previews']) {
    assert.equal(present(path.join(h.dataDir, root, 'Suki', 'Retratos', id + '.webp')), true);
    assert.equal(present(path.join(h.dataDir, root, 'Suki', 'Vacaciones', id + '.webp')), false);
  }
  assert.equal((await call('PATCH', '/api/files/' + id, { parent: '/Suki' })).res.status, 200);
  for (const root of ['thumbs', 'previews']) {
    assert.equal(present(path.join(h.dataDir, root, 'Suki', id + '.webp')), true);
    assert.equal(present(path.join(h.dataDir, root, 'Suki', 'Retratos', id + '.webp')), false);
  }
});

test('eliminar una fotografía de la app invalida su caché', async (t) => {
  if (!sharp) return t.skip('sharp no está instalado en este entorno');
  assert.equal((await call('DELETE', '/api/files/' + id)).res.status, 204);
  for (const root of ['thumbs', 'previews']) assert.equal(present(path.join(h.dataDir, root, 'Suki', id + '.webp')), false);
});
