// Telegram no deja editar mensajes con más de 48 h en grupos: las carpetas se republican y los archivos dan un error claro.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeHarness } from './helpers/harness.js';

let h; let call;
before(async () => { h = await makeHarness(); call = h.call; await h.login(); });
after(() => h.close());

test('carpeta con mensaje caducado: papelera, restaurar, renombrar y mover siguen funcionando', async () => {
  await call('POST', '/api/folders', { parent: '/', name: 'Vieja' });
  await call('POST', '/api/folders', { parent: '/', name: 'Destino' });
  const tree = h.catalog.tree;
  const id = tree.resolve('/Vieja');
  const oldMsg = tree.get(id).msgId;
  h.tg.expired.add(oldMsg);

  const trashed = await call('DELETE', '/api/folders?path=/Vieja');
  assert.equal(trashed.res.status, 200, trashed.text);
  const newMsg = tree.get(id).msgId;
  assert.notEqual(newMsg, oldMsg);
  assert.equal(h.tg.messages.has(oldMsg), false);
  assert.match(h.tg.messages.get(newMsg).message, /Vieja/);
  assert.ok(tree.get(id).trashed > 0);

  h.tg.expired.add(newMsg);
  await call('POST', '/api/trash/restore', { folders: [id] });
  assert.equal(tree.get(id).trashed, 0);
  const restoredMsg = tree.get(id).msgId;
  assert.notEqual(restoredMsg, newMsg);

  h.tg.expired.add(restoredMsg);
  assert.equal((await call('PATCH', '/api/folders', { path: '/Vieja', name: 'Nueva' })).res.status, 200);
  const renamedMsg = tree.get(id).msgId;
  h.tg.expired.add(renamedMsg);
  await call('POST', '/api/bulk', { action: 'move', folders: ['/Nueva'], parent: '/Destino' });
  assert.equal(tree.pathOf(id), '/Destino/Nueva');
  // Una carpeta republicada sigue existiendo tras releer Telegram
  await call('POST', '/api/refresh'); await h.waitSync();
  assert.equal(tree.pathOf(id), '/Destino/Nueva');
});

test('archivo con mensaje caducado: error 409 comprensible en vez de error interno', async () => {
  const file = h.tg.addFile({ folder: h.catalog.tree.resolve('/Destino'), name: 'a.mp3', bytes: Buffer.alloc(300, 1) });
  await call('POST', '/api/refresh'); await h.waitSync();
  h.tg.expired.add(file.id);
  const r = await call('DELETE', `/api/files/${file.id}`);
  assert.equal(r.res.status, 409);
  assert.match(r.json.error, /48 horas/);
});
