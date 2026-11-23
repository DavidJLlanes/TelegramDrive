import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeHarness } from './helpers/harness.js';
import { encodeFolder, decode } from '../server/telegram/codec.js';

let h;
before(async () => { h = await makeHarness(); await h.login(); await h.call('POST', '/api/folders', { parent: '/', name: 'Música' }); });
after(() => h.close());
const list = async () => (await h.call('GET', '/api/list?path=/')).json.folders;

test('el color viaja en el pie del mensaje y se lee al sincronizar', () => {
  const text = encodeFolder({ id: 'a1', parent: 'root', name: 'Música', color: 245 });
  assert.equal(decode(text).color, 245);
  assert.equal(decode(encodeFolder({ id: 'a1', parent: 'root', name: 'X' })).color, -1);
  assert.equal(decode(text.replace('"c":245', '"c":999')).color, -1, 'un tono fuera de rango se ignora');
});

test('PATCH /folders cambia el color, lo devuelve en el listado y lo conserva al renombrar y mover', async () => {
  const r = await h.call('PATCH', '/api/folders', { path: '/Música', color: 160 });
  assert.equal(r.res.status, 200);
  assert.equal((await list()).find((f) => f.name === 'Música').color, 160);
  const caption = [...h.tg.messages.values()].find((m) => String(m.message).includes('"n":"Música"')).message;
  assert.equal(decode(caption).color, 160);

  await h.call('PATCH', '/api/folders', { path: '/Música', name: 'Discos' });
  assert.equal((await list()).find((f) => f.name === 'Discos').color, 160, 'renombrar no pierde el color');
  await h.call('POST', '/api/folders', { parent: '/', name: 'Destino' });
  await h.call('PATCH', '/api/folders', { path: '/Discos', parent: '/Destino' });
  const inside = (await h.call('GET', '/api/list?path=/Destino')).json.folders;
  assert.equal(inside.find((f) => f.name === 'Discos').color, 160, 'mover no pierde el color');
});

test('color automático, valores no válidos y sin sesión', async () => {
  assert.equal((await h.call('PATCH', '/api/folders', { path: '/Destino/Discos', color: null })).res.status, 200);
  assert.equal((await h.call('GET', '/api/list?path=/Destino')).json.folders[0].color, null);
  for (const bad of [360, -5, 'rojo', 1.5]) {
    assert.equal((await h.call('PATCH', '/api/folders', { path: '/Destino/Discos', color: bad })).res.status, 400, String(bad));
  }
  assert.equal((await h.call('PATCH', '/api/folders', { path: '/', color: 10 })).res.status, 400, 'la raíz no se colorea');
  assert.equal((await fetch(`${h.base}/api/folders`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: '{}' })).status, 401);
});

test('el color sobrevive a la papelera y a la restauración', async () => {
  await h.call('PATCH', '/api/folders', { path: '/Destino/Discos', color: 285 });
  const trashed = await h.call('DELETE', '/api/folders?path=/Destino/Discos');
  assert.equal(trashed.res.status, 200);
  const id = trashed.json.id;
  const restored = await h.call('POST', '/api/trash/restore', { folders: [id] });
  assert.ok(restored.res.status < 300, restored.text);
  assert.equal((await h.call('GET', '/api/list?path=/Destino')).json.folders.find((f) => f.name === 'Discos').color, 285);
});
