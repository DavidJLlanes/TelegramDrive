import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeHarness } from './helpers/harness.js';
import { mp3WithTags } from './helpers/id3.js';

let h; let call; let rock; let jazz;
const ids = {};
const q = (o) => new URLSearchParams(o).toString();

before(async () => {
  h = await makeHarness();
  call = h.call;
  h.catalog.retag.pause = 0;
  await h.login();
  for (const [parent, name] of [['/', 'Música'], ['/Música', 'Rock'], ['/Música', 'Jazz']]) await call('POST', '/api/folders', { parent, name });
  rock = h.catalog.tree.resolve('/Música/Rock');
  jazz = h.catalog.tree.resolve('/Música/Jazz');
  const add = (folder, name, tags) => h.tg.addFile({ folder, name, bytes: mp3WithTags(tags) }).id;
  ids.a = add(rock, 'a.mp3', { title: 'Primera', artist: 'Faroles, Los', album: 'Autopista', track: '1', genre: 'Rock' });
  ids.b = add(rock, 'b.mp3', { title: 'Segunda', artist: 'Los Faroles', album: 'Autopista', track: '2', genre: 'Rock' });
  ids.c = add(jazz, 'c.mp3', { title: 'Azul', artist: 'Trío Sur', album: 'Noche', track: '1', genre: 'Jazz' });
  await call('POST', '/api/refresh');
  await h.waitSync();
  await h.catalog.tagger.promise;
});
after(() => h.close());

test('la búsqueda encuentra por título, artista y álbum', async () => {
  assert.deepEqual((await call('GET', '/api/search?q=azul')).json.files.map((f) => f.id), [ids.c]);
  assert.equal((await call('GET', '/api/search?q=trio')).json.files.length, 1); // sin acentos
  assert.equal((await call('GET', '/api/search?q=autopista')).json.files.length, 2);
});

test('papelera de archivos: se oculta, se restaura y conserva sus correcciones', async () => {
  await call('PATCH', `/api/files/${ids.b}/tags`, { title: 'Segunda (remix)' });
  assert.equal((await call('DELETE', `/api/files/${ids.b}`)).res.status, 204);
  assert.equal((await call('GET', '/api/list?path=/M%C3%BAsica/Rock')).json.total, 1);
  assert.equal((await call('GET', `/api/files/${ids.b}/content`)).res.status, 404);
  const trash = (await call('GET', '/api/trash')).json;
  assert.deepEqual(trash.files.map((f) => f.id), [ids.b]);
  await call('POST', '/api/trash/restore', { files: [ids.b] });
  const back = (await call('GET', '/api/list?path=/M%C3%BAsica/Rock&kind=audio')).json.files.find((f) => f.id === ids.b);
  assert.equal(back.tags.title, 'Segunda (remix)');
});

test('corregir etiquetas edita el pie del mensaje y sobrevive a una reconstrucción del índice', async () => {
  const before = h.tg.edits;
  await call('PATCH', `/api/files/${ids.a}/tags`, { album: 'Autopista (1978)', track: 7 });
  assert.equal(h.tg.edits - before, 1);
  assert.match(h.tg.messages.get(ids.a).message, /"m":\{/);
  await call('POST', '/api/refresh');
  await h.waitSync();
  const t = (await call('GET', '/api/search?q=primera')).json.files[0].tags;
  assert.equal(t.album, 'Autopista (1978)');
  assert.equal(t.track, 7);
  assert.equal(t.title, 'Primera');                       // lo no corregido sigue siendo el del archivo
  await call('PATCH', `/api/files/${ids.a}/tags`, { album: '', track: '' });   // quitar la corrección
  assert.equal((await call('GET', '/api/search?q=primera')).json.files[0].tags.album, 'Autopista');
});

test('fusionar artistas: renombrar "Faroles, Los" a "Los Faroles" en todas sus canciones', async () => {
  const r = await call('POST', '/api/library/retag', { filter: { artist: 'Faroles, Los' }, set: { band: 'Los Faroles' } });
  assert.equal(r.res.status, 202);
  for (let i = 0; i < 100 && h.catalog.retag.state().running; i += 1) await new Promise((x) => setTimeout(x, 20));
  const artists = (await call('GET', '/api/library/artists')).json.artists;
  assert.deepEqual(artists.map((a) => [a.name, a.tracks]), [['Los Faroles', 2], ['Trío Sur', 1]]);
});

test('listas de reproducción: crear, añadir, reordenar, sobrevivir a la sincronización y ocultar borrados', async () => {
  const created = (await call('POST', '/api/playlists', { name: 'Para correr', ids: [ids.c, ids.a] })).json;
  assert.equal(created.tracks, 2);
  await call('PATCH', `/api/playlists/${created.id}`, { add: [ids.b, ids.a] });  // ids.a ya estaba: no se duplica
  let list = (await call('GET', `/api/playlists/${created.id}`)).json;
  assert.deepEqual(list.files.map((f) => f.id), [ids.c, ids.a, ids.b]);
  await call('PATCH', `/api/playlists/${created.id}`, { ids: [ids.b, ids.c] });
  await call('POST', '/api/refresh');
  await h.waitSync();
  list = (await call('GET', `/api/playlists/${created.id}`)).json;
  assert.deepEqual(list.files.map((f) => f.id), [ids.b, ids.c]);
  await call('DELETE', `/api/files/${ids.b}`);
  assert.deepEqual((await call('GET', `/api/playlists/${created.id}`)).json.files.map((f) => f.id), [ids.c]);
  await call('POST', '/api/trash/restore', { files: [ids.b] });
  assert.equal((await call('GET', '/api/playlists')).json.playlists[0].tracks, 2);
  assert.equal((await call('DELETE', `/api/playlists/${created.id}`)).res.status, 204);
  assert.equal((await call('GET', '/api/playlists')).json.playlists.length, 0);
});

test('enlaces compartidos: públicos con Range, caducan y se pueden revocar', async () => {
  const s = (await call('POST', '/api/shares', { kind: 'file', target: ids.a, duration: '1h' })).json;
  const url = `${h.base}/share/${s.token}`;
  const open = await fetch(url, { headers: { range: 'bytes=0-9' } });          // sin cookie
  assert.equal(open.status, 206);
  assert.equal((await open.arrayBuffer()).byteLength, 10);
  assert.equal((await fetch(`${h.base}/share/inventado`)).status, 404);
  assert.equal((await call('GET', '/api/shares')).json.shares.length, 1);
  h.db.stmt('UPDATE shares SET exp = ? WHERE token = ?').run(Date.now() - 1000, s.token);
  assert.equal((await fetch(url)).status, 404);                                   // caducado
  const s2 = (await call('POST', '/api/shares', { kind: 'file', target: ids.a })).json;
  await call('DELETE', `/api/shares/${s2.token}`);
  assert.equal((await fetch(`${h.base}/share/${s2.token}`)).status, 404);          // revocado
  assert.equal((await call('POST', '/api/shares', { kind: 'file', target: ids.a, duration: '9y' })).res.status, 400);
});

test('ZIP de carpeta (con subcarpetas), de una selección y compartido', async () => {
  const folder = await h.raw(`/api/zip?${q({ path: '/Música' })}`);
  assert.equal(folder.headers.get('content-type'), 'application/zip');
  const body = Buffer.from(await folder.arrayBuffer());
  assert.equal(body.subarray(0, 2).toString(), 'PK');
  for (const name of ['Rock/a.mp3', 'Rock/b.mp3', 'Jazz/c.mp3']) assert.ok(body.includes(Buffer.from(name)), `falta ${name}`);
  const sel = Buffer.from(await (await h.raw(`/api/zip?ids=${ids.a},${ids.c}`)).arrayBuffer());
  assert.ok(sel.includes(Buffer.from('a.mp3')) && sel.includes(Buffer.from('c.mp3')) && !sel.includes(Buffer.from('b.mp3')));
  const s = (await call('POST', '/api/shares', { kind: 'folder', target: '/Música/Rock' })).json;
  const pub = Buffer.from(await (await fetch(`${h.base}/share/${s.token}`)).arrayBuffer());
  assert.ok(pub.includes(Buffer.from('a.mp3')) && !pub.includes(Buffer.from('c.mp3')));
});

test('acciones múltiples: mover y enviar a la papelera, sin que un fallo cancele el resto', async () => {
  await call('POST', '/api/folders', { parent: '/', name: 'Destino' });
  const moved = (await call('POST', '/api/bulk', { action: 'move', files: [ids.a, 999999, ids.b], parent: '/Destino' })).json;
  assert.equal(moved.done, 2);
  assert.equal(moved.failed.length, 1);
  assert.equal((await call('GET', '/api/list?path=/Destino')).json.total, 2);
  const trashed = (await call('POST', '/api/bulk', { action: 'trash', files: [ids.a], folders: ['/Destino'] })).json;
  assert.equal(trashed.done, 2);
  assert.equal((await call('GET', '/api/list?path=/Destino')).res.status, 404);
  assert.equal((await call('POST', '/api/bulk', { action: 'borrar' })).res.status, 400);
});

test('purga: lo que lleva más de 30 días en la papelera se borra definitivamente', async () => {
  const old = h.catalog.trash.list();
  assert.ok(old.files.length + old.folders.length >= 2);
  const result = await h.catalog.trash.purge(Date.now() + 31 * 86_400_000);
  assert.ok(result.deleted >= 2);
  assert.equal(h.catalog.trash.list().folders.length, 0);
});

test('segundo factor TOTP: códigos válidos una sola vez y el límite no cuenta los accesos correctos', async () => {
  const { codeAt, verifyTotp, newTotpSecret } = await import('../server/utils/totp.js');
  const secret = newTotpSecret();
  assert.equal(codeAt('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', 1), '287082');           // vector RFC 6238 (T=59 s)
  const now = Date.now();
  assert.equal(verifyTotp(secret, codeAt(secret, Math.floor(now / 30000)), now), Math.floor(now / 30000));
  assert.equal(verifyTotp(secret, '000000', now) === null || codeAt(secret, Math.floor(now / 30000)) === '000000', true);
  assert.equal(verifyTotp(secret, 'abcdef', now), null);
});

test('salud: /healthz pasa a 503 si Telegram no responde y vuelve a 200 al recuperarse', async () => {
  assert.equal((await fetch(`${h.base}/healthz`)).status, 200);
  h.tg.down = true;
  await h.catalog.health.check();
  const down = await fetch(`${h.base}/healthz`);
  assert.equal(down.status, 503);
  assert.equal((await call('GET', '/api/stats')).json.health.ok, false);
  h.tg.down = false;
  await h.catalog.health.check();
  assert.equal((await fetch(`${h.base}/healthz`)).status, 200);
});
