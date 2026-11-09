import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeHarness } from './helpers/harness.js';

let h; let call; const ids = {};
before(async () => {
  h = await makeHarness(); call = h.call; await h.login();
  await call('POST', '/api/folders', { parent: '/', name: 'Fotos' });
  const folder = h.catalog.tree.resolve('/Fotos');
  ids.a = h.tg.addFile({ folder, name: 'a.png', bytes: Buffer.from('a') }).id;
  ids.b = h.tg.addFile({ folder, name: 'b.png', bytes: Buffer.from('b') }).id;
  ids.song = h.tg.addFile({ folder, name: 'c.mp3', bytes: Buffer.from('c') }).id;
  await call('POST', '/api/refresh'); await h.waitSync();
});
after(() => h.close());

test('crear, listar, añadir (solo fotos), abrir y quitar', async () => {
  const created = await call('POST', '/api/photo-albums', { name: '  Verano   2024 ', ids: [ids.a, ids.song] });
  assert.equal(created.res.status, 201);
  const album = created.json.album;
  assert.equal(album.name, 'Verano 2024');
  const add = await call('POST', `/api/photo-albums/${album.id}/items`, { ids: [ids.a, ids.b, ids.song, 999999] });
  assert.equal(add.json.added, 1); // a ya estaba; la canción y la inexistente se ignoran
  const list = (await call('GET', '/api/photo-albums')).json.albums;
  assert.deepEqual(list.map((a) => [a.name, a.count, a.cover]), [['Verano 2024', 2, ids.b]]);
  const open = (await call('GET', `/api/photo-albums/${album.id}`)).json;
  assert.deepEqual(open.photos.map((p) => p.id).sort(), [ids.a, ids.b].sort());
  assert.equal((await call('DELETE', `/api/photo-albums/${album.id}/items`, { ids: [ids.a] })).json.removed, 1);
  assert.equal((await call('GET', `/api/photo-albums/${album.id}`)).json.photos.length, 1);
});

test('renombrar y borrar el álbum no toca las fotos', async () => {
  const { id } = (await call('POST', '/api/photo-albums', { name: 'Temporal', ids: [ids.a] })).json.album;
  assert.equal((await call('PATCH', `/api/photo-albums/${id}`, { name: 'Renombrado' })).json.album.name, 'Renombrado');
  assert.equal((await call('DELETE', `/api/photo-albums/${id}`)).json.removed, true);
  assert.equal((await call('GET', `/api/photo-albums/${id}`)).res.status, 404);
  assert.equal(h.catalog.getFile(ids.a).name, 'a.png');
});

test('validación y sesión', async () => {
  assert.equal((await call('POST', '/api/photo-albums', { name: '   ' })).res.status, 400);
  assert.equal((await call('POST', '/api/photo-albums', { name: 'x'.repeat(81) })).res.status, 400);
  assert.equal((await call('PATCH', '/api/photo-albums/999', { name: 'x' })).res.status, 404);
  assert.equal((await call('POST', '/api/photo-albums/999/items', { ids: [1] })).res.status, 404);
  assert.equal((await call('POST', '/api/photo-albums/1/items', { ids: 'no' })).res.status, 400);
  assert.equal((await fetch(`${h.base}/api/photo-albums`)).status, 401);
});

test('reiniciar con el índice vacío no borra letras ni álbumes (los datos propios sobreviven a reconstruir el índice)', async () => {
  const { id } = (await call('POST', '/api/photo-albums', { name: 'Persistente', ids: [ids.a] })).json.album;
  h.db.exec('DELETE FROM files');
  h.db.stmt("INSERT INTO lyrics (msg_id, text, source, updated_at) VALUES (?, 'x', 'manual', 0)").run(ids.a);
  h.features.stop(); h.features.start();
  assert.equal(h.db.stmt('SELECT COUNT(*) AS n FROM photo_album_items WHERE album_id = ?').get(id).n, 1);
  assert.equal(h.db.stmt('SELECT COUNT(*) AS n FROM lyrics').get().n, 1);
  assert.equal((await call('GET', '/api/photo-albums')).json.albums.find((a) => a.id === id).count, 0); // el recuento solo cuenta fotos existentes
});
