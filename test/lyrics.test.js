import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeHarness } from './helpers/harness.js';
import { mp3WithTags } from './helpers/id3.js';

let h; let call; const ids = {};
before(async () => {
  h = await makeHarness(); call = h.call; await h.login();
  await call('POST', '/api/folders', { parent: '/', name: 'Música' });
  const folder = h.catalog.tree.resolve('/Música');
  ids.con = h.tg.addFile({ folder, name: 'con.mp3', bytes: mp3WithTags({ title: 'Con', lyrics: 'Primera línea\r\nSegunda línea' }) }).id;
  ids.sin = h.tg.addFile({ folder, name: 'sin.mp3', bytes: mp3WithTags({ title: 'Sin' }) }).id;
  ids.img = h.tg.addFile({ folder, name: 'f.png', bytes: Buffer.from('x') }).id;
  await call('POST', '/api/refresh'); await h.waitSync();
});
after(() => h.close());

test('sin letra devuelve null; se guarda, se normaliza y se borra', async () => {
  assert.equal((await call('GET', `/api/lyrics/${ids.sin}`)).json.lyrics, null);
  const put = await call('PUT', `/api/lyrics/${ids.sin}`, { text: '  Hola\r\nmundo \n' });
  assert.equal(put.json.lyrics.text, 'Hola\nmundo');
  assert.equal(put.json.lyrics.source, 'manual');
  assert.equal((await call('GET', `/api/lyrics/${ids.sin}`)).json.lyrics.text, 'Hola\nmundo');
  assert.equal((await call('DELETE', `/api/lyrics/${ids.sin}`)).json.removed, true);
  assert.equal((await call('GET', `/api/lyrics/${ids.sin}`)).json.lyrics, null);
});

test('valida: vacía, demasiado larga, no es canción, no existe', async () => {
  assert.equal((await call('PUT', `/api/lyrics/${ids.sin}`, { text: '   ' })).res.status, 400);
  assert.equal((await call('PUT', `/api/lyrics/${ids.sin}`, { text: 'a'.repeat(20001) })).res.status, 400);
  assert.equal((await call('GET', `/api/lyrics/${ids.img}`)).res.status, 400);
  assert.equal((await call('GET', '/api/lyrics/999999')).res.status, 404);
});

test('importa la letra incrustada en el archivo', async () => {
  const r = await call('POST', `/api/lyrics/${ids.con}/import`);
  assert.equal(r.res.status, 200, r.text);
  assert.equal(r.json.lyrics.text, 'Primera línea\nSegunda línea');
  assert.equal(r.json.lyrics.source, 'file');
  const none = await call('POST', `/api/lyrics/${ids.sin}/import`);
  assert.equal(none.res.status, 404);
});

test('exige sesión', async () => {
  assert.equal((await fetch(`${h.base}/api/lyrics/${ids.con}`)).status, 401);
});
