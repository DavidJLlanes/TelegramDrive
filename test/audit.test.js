// Regresiones de la auditoría: entradas malformadas, enlaces que sobreviven a renombrar y Range inválido.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeHarness } from './helpers/harness.js';

let h; let call; let file;
before(async () => {
  h = await makeHarness(); call = h.call; await h.login();
  await call('POST', '/api/folders', { parent: '/', name: 'A' });
  file = h.tg.addFile({ folder: h.catalog.tree.resolve('/A'), name: 'x.mp3', bytes: Buffer.alloc(5000, 1) });
  await call('POST', '/api/refresh'); await h.waitSync();
});
after(() => h.close());

test('listas y etiquetas rechazan o ignoran valores que no son del tipo esperado', async () => {
  assert.equal((await call('POST', '/api/playlists', { name: 'x', ids: 'no' })).res.status, 400);
  const l = (await call('POST', '/api/playlists', { name: 'ok', ids: [file.id] })).json;
  assert.equal((await call('PATCH', `/api/playlists/${l.id}`, { add: 'no' })).res.status, 200);
  await call('PATCH', `/api/files/${file.id}/tags`, { title: { a: 1 }, album: 'Bueno' });
  const t = (await call('GET', '/api/search?q=bueno')).json.files[0].tags;
  assert.equal(t.album, 'Bueno');
  assert.notEqual(t.title, '[object Object]');
});

test('el reetiquetado masivo exige un filtro y un cambio válidos', async () => {
  assert.equal((await call('POST', '/api/library/retag', { filter: 'x', set: 5 })).res.status, 400);
  assert.equal((await call('POST', '/api/library/retag', { filter: { artist: 'Z' }, set: {} })).res.status, 400);
});

test('un enlace de carpeta sigue funcionando tras renombrarla y falla si la carpeta se envía a la papelera', async () => {
  const share = (await call('POST', '/api/shares', { kind: 'folder', target: '/A', duration: '1h' })).json;
  await call('PATCH', '/api/folders', { path: '/A', name: 'Renombrada' });
  const ok = await h.raw(`/share/${share.token}`);
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get('content-type'), 'application/zip');
  await ok.arrayBuffer();
  await call('DELETE', '/api/folders?path=/Renombrada');
  assert.equal((await h.raw(`/share/${share.token}`)).status, 404);
});

test('Range inválido no provoca error 500', async () => {
  await call('POST', '/api/folders', { parent: '/', name: 'B' });
  const f = h.tg.addFile({ folder: h.catalog.tree.resolve('/B'), name: 'y.bin', bytes: Buffer.alloc(100, 2) });
  await call('POST', '/api/refresh'); await h.waitSync();
  for (const range of ['bytes=abc', 'bytes=10-5', 'bytes=999999-', 'bytes=-0', 'bytes=0-1,5-9', 'items=0-1']) {
    const r = await call('GET', `/api/files/${f.id}/content`, undefined, { Range: range });
    assert.ok(r.res.status < 500, `${range} -> ${r.res.status}`);
  }
});
