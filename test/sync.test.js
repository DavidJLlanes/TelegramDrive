import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeHarness } from './helpers/harness.js';

let h; let call; let discosId;
before(async () => {
  h = await makeHarness();
  call = h.call;
  await h.login();
  await call('POST', '/api/folders', { parent: '/', name: 'Discos' });
  discosId = h.catalog.tree.resolve('/Discos');
  for (let n = 1; n <= 650; n += 1) h.tg.addFile({ folder: discosId, name: `track ${n}.mp3` }); // subidos "desde fuera"
  await call('POST', '/api/refresh');
  await h.waitSync();
});
after(() => h.close());

test('la sincronización completa indexa 650 archivos y la lista se pagina con orden natural', async () => {
  const first = await call('GET', '/api/list?path=/Discos&limit=300');
  assert.equal(first.json.total, 650);
  assert.equal(first.json.files.length, 300);
  assert.deepEqual(first.json.files.slice(0, 3).map((f) => f.name), ['track 1.mp3', 'track 2.mp3', 'track 3.mp3']);
  const last = await call('GET', '/api/list?path=/Discos&offset=600&limit=300');
  assert.equal(last.json.files.length, 50);
  assert.equal(last.json.files.at(-1).name, 'track 650.mp3');
  const audio = await call('GET', '/api/list?path=/Discos&kind=audio&limit=5000');
  assert.equal(audio.json.files.length, 650);
  assert.equal((await call('GET', '/api/list?path=/Discos&kind=video')).json.total, 0);
  assert.equal((await call('GET', '/api/list?path=/Discos&sort=nope')).res.status, 400);
});

test('renombrar o mover una carpeta con 650 archivos edita UN solo mensaje', async () => {
  const before = h.tg.edits;
  const ren = await call('PATCH', '/api/folders', { path: '/Discos', name: 'Mi música' });
  assert.equal(ren.json.path, '/Mi música');
  assert.equal(h.tg.edits - before, 1);
  await call('POST', '/api/folders', { parent: '/', name: 'Archivo' });
  const mv = await call('PATCH', '/api/folders', { path: '/Mi música', parent: '/Archivo' });
  assert.equal(mv.json.path, '/Archivo/Mi música');
  assert.equal(h.tg.edits - before, 2);
  const list = await call('GET', '/api/list?path=/Archivo/Mi%20m%C3%BAsica&limit=5');
  assert.equal(list.json.total, 650);
  assert.equal(list.json.files[0].parent, '/Archivo/Mi música');
  assert.equal((await call('GET', '/api/search?q=TRACK%2065')).json.files.length, 2); // acentos/mayúsculas: "track 65" y "track 650"
});

test('sync incremental: solo lee los mensajes nuevos', async () => {
  const folder = h.catalog.tree.resolve('/Archivo/Mi música');
  h.tg.addFile({ folder, name: 'nuevo.mp3' });
  const fresh = new h.Catalog(h.tg, h.db); // como tras reiniciar el servicio
  await fresh.startSync();
  assert.equal(fresh.syncer.state.full, false);
  // 2 = el nuevo archivo + la carpeta 'Archivo' creada por la app tras el último sync (relectura idempotente). Nunca 650+.
  assert.equal(fresh.syncer.state.scanned, 2);
  assert.equal(fresh.list('/Archivo/Mi música').total, 651);
});

test('sync completa poda lo borrado fuera de la app, pero nunca vacía el índice por error', async () => {
  const victim = [...h.tg.messages.values()].find((m) => m.message.includes('"track 7.mp3"'));
  h.tg.messages.delete(victim.id);
  await call('POST', '/api/refresh');
  await h.waitSync();
  assert.equal((await call('GET', '/api/list?path=/Archivo/Mi%20m%C3%BAsica&limit=1')).json.total, 650);

  const saved = new Map(h.tg.messages);
  h.tg.messages.clear(); // Telegram "no devuelve nada"
  await call('POST', '/api/refresh');
  await h.waitSync();
  assert.equal((await call('GET', '/api/list?path=/Archivo/Mi%20m%C3%BAsica&limit=1')).json.total, 650);
  saved.forEach((m, id) => h.tg.messages.set(id, m));
});

test('a la papelera con 650 archivos = UNA edición; restaurar los devuelve; borrar definitivamente va por lotes', async () => {
  const edits = h.tg.edits;
  await call('DELETE', '/api/folders?path=/Archivo');
  assert.equal(h.tg.edits - edits, 1);
  assert.equal((await call('GET', '/api/stats')).json.files, 0);
  assert.equal((await call('GET', '/api/search?q=track')).json.files.length, 0);
  const trash = (await call('GET', '/api/trash')).json;
  assert.equal(trash.folders.length, 1);
  assert.equal(trash.folders[0].files, 650);

  await call('POST', '/api/trash/restore', { folders: [trash.folders[0].id] });
  assert.equal((await call('GET', '/api/stats')).json.files, 650);
  assert.equal((await call('GET', '/api/list?path=/Archivo/Mi%20m%C3%BAsica&limit=1')).json.total, 650);

  await call('DELETE', '/api/folders?path=/Archivo');
  const before = h.tg.removeCalls;
  const del = await call('POST', '/api/trash/empty');
  assert.ok(del.json.deleted >= 650);
  assert.equal(h.tg.removeCalls - before, 1);
  assert.equal((await call('GET', '/api/trash')).json.folders.length, 0);
});
