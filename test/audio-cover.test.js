import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { makeHarness } from './helpers/harness.js';

let h; let song;
before(async () => {
  h = await makeHarness(); await h.login();
  song = h.tg.addFile({ folder: h.catalog.tree.resolve('/'), name: 'tema.mp3', bytes: Buffer.alloc(300, 3) });
  await h.call('POST', '/api/refresh'); await h.waitSync();
});
after(() => h.close());

test('la carátula extraída de un audio se sirve en /thumb (regresión de la caché fotográfica)', async () => {
  await fs.mkdir(path.join(h.dataDir, 'thumbs'), { recursive: true });
  await fs.writeFile(path.join(h.dataDir, 'thumbs', `${song.id}.jpg`), Buffer.from('caratula'));
  const r = await h.raw(`/api/files/${song.id}/thumb`);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('content-type'), 'image/jpeg');
  assert.equal(await r.text(), 'caratula');
});

test('el audio no tiene vista previa de foto', async () => {
  assert.equal((await h.raw(`/api/files/${song.id}/preview`)).status, 404);
});
