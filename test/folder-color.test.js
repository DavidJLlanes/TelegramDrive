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
  assert.equal(decode(text.replace('"c":245', '"c":1500')).color, -1, 'un color fuera de rango se ignora');
  assert.equal(decode(text.replace('"c":245', '"c":965')).color, 965, 'tonalidad intensa/suave/neutra (tono + 360 × tonalidad)');
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
  for (const bad of [1440, -5, 'rojo', 1.5]) {
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

test('icono de carpeta: se guarda, se valida y se hereda el tono de la madre con desplazamiento', async () => {
  const set = (path, body) => h.call('PATCH', '/api/folders', { path, ...body });
  await h.call('POST', '/api/folders', { parent: '/', name: 'Madre' });
  await h.call('POST', '/api/folders', { parent: '/Madre', name: 'Hija' });
  await h.call('POST', '/api/folders', { parent: '/Madre/Hija', name: 'Nieta' });
  assert.equal((await set('/Madre', { color: 100, icon: 'music' })).res.status, 200);
  assert.equal((await set('/Madre', { icon: 'no-existe' })).res.status, 400);
  assert.equal((await set('/Madre', { icon: '<script>' })).res.status, 400);
  const top = (await h.call('GET', '/api/list?path=/')).json.folders.find((f) => f.name === 'Madre');
  assert.equal(top.icon, 'music'); assert.equal(top.color, 100); assert.equal(top.inherited, null);
  assert.equal((await set('/Madre', { icon: 'none' })).res.status, 200);
  assert.equal((await h.call('GET', '/api/list?path=/')).json.folders.find((f) => f.name === 'Madre').icon, 'none');
  const child = (await h.call('GET', '/api/list?path=/Madre')).json.folders[0];
  assert.equal(child.color, null); assert.equal(child.inherited, 114);
  const grand = (await h.call('GET', '/api/list?path=/Madre/Hija')).json.folders[0];
  assert.equal(grand.inherited, 128);
  assert.equal((await set('/Madre', { icon: '' })).res.status, 200);
  assert.equal((await h.call('GET', '/api/list?path=/')).json.folders.find((f) => f.name === 'Madre').icon, null);
  const caption = [...h.tg.messages.values()].find((m) => String(m.message).includes('"n":"Madre"')).message;
  assert.equal(decode(caption).color, 100, 'quitar el icono no pierde el color');
});

test('estilo en bloque: color e icono para varias carpetas a la vez', async () => {
  await h.call('POST', '/api/folders', { parent: '/', name: 'Lote A' });
  await h.call('POST', '/api/folders', { parent: '/', name: 'Lote B' });
  const r = await h.call('PATCH', '/api/folders/style', { paths: ['/Lote A', '/Lote B', '/No existe'], color: 2 * 360 + 120, icon: 'sun' });
  assert.equal(r.res.status, 200);
  assert.equal(r.json.updated, 2);
  assert.equal(r.json.failed.length, 1);
  const root = (await h.call('GET', '/api/list?path=/')).json.folders;
  for (const name of ['Lote A', 'Lote B']) {
    const f = root.find((x) => x.name === name);
    assert.equal(f.color, 840); assert.equal(f.icon, 'sun');
  }
  assert.equal((await h.call('PATCH', '/api/folders/style', { paths: ['/Lote A'], icon: 'none' })).json.updated, 1, 'quitar icono');
  assert.equal((await h.call('GET', '/api/list?path=/')).json.folders.find((x) => x.name === 'Lote A').color, 840, 'cambiar solo el icono conserva el color');
  assert.equal((await h.call('PATCH', '/api/folders/style', { paths: ['/Lote A'], color: 'rojo' })).res.status, 400);
  assert.equal((await h.call('PATCH', '/api/folders/style', { paths: [] , color: 10 })).res.status, 400);
});
