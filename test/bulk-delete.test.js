// Borrado masivo definitivo: archivos y carpetas (anidadas) de una sola vez, también en Telegram.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeHarness } from './helpers/harness.js';

let h; let call;
before(async () => { h = await makeHarness(); call = h.call; await h.login(); });
after(() => h.close());

test('bulk delete elimina archivos y carpetas anidadas aunque se seleccionen padre e hijo', async () => {
  await call('POST', '/api/folders', { parent: '/', name: 'Lote' });
  await call('POST', '/api/folders', { parent: '/Lote', name: 'Hija' });
  await call('POST', '/api/folders', { parent: '/', name: 'Intacta' });
  const tree = h.catalog.tree;
  const a = h.tg.addFile({ folder: tree.resolve('/Lote'), name: 'a.mp3', bytes: Buffer.alloc(300, 1) });
  const b = h.tg.addFile({ folder: tree.resolve('/Lote/Hija'), name: 'b.mp3', bytes: Buffer.alloc(300, 2) });
  const keep = h.tg.addFile({ folder: tree.resolve('/Intacta'), name: 'c.mp3', bytes: Buffer.alloc(300, 3) });
  await call('POST', '/api/refresh'); await h.waitSync();
  const folderMsgs = [tree.get(tree.resolve('/Lote')).msgId, tree.get(tree.resolve('/Lote/Hija')).msgId];

  const r = await call('POST', '/api/bulk', { action: 'delete', files: [a.id], folders: ['/Lote', '/Lote/Hija'] });
  assert.equal(r.res.status, 200, r.text);
  assert.deepEqual(r.json.failed, []);
  assert.equal(r.json.done, 3);
  assert.equal(tree.resolve('/Lote'), null);
  for (const id of [a.id, b.id, ...folderMsgs]) assert.equal(h.tg.messages.has(id), false, `mensaje ${id} sigue en Telegram`);
  assert.equal(h.tg.messages.has(keep.id), true);
  assert.notEqual(tree.resolve('/Intacta'), null);
});

test('bulk delete solo con archivos y acción desconocida rechazada', async () => {
  await call('POST', '/api/folders', { parent: '/', name: 'Sueltos' });
  const x = h.tg.addFile({ folder: h.catalog.tree.resolve('/Sueltos'), name: 'x.mp3', bytes: Buffer.alloc(300, 1) });
  const y = h.tg.addFile({ folder: h.catalog.tree.resolve('/Sueltos'), name: 'y.mp3', bytes: Buffer.alloc(300, 2) });
  await call('POST', '/api/refresh'); await h.waitSync();
  const r = await call('POST', '/api/bulk', { action: 'delete', files: [x.id, y.id], folders: [] });
  assert.equal(r.json.done, 2);
  assert.equal(h.tg.messages.has(x.id) || h.tg.messages.has(y.id), false);
  assert.equal((await call('POST', '/api/bulk', { action: 'explode', files: [] })).res.status, 400);
});
