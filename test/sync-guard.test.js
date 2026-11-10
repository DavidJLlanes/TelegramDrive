import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeHarness } from './helpers/harness.js';

let h; let call;
before(async () => {
  h = await makeHarness(); call = h.call; await h.login();
  const root = h.catalog.tree.resolve('/');
  for (let n = 1; n <= 60; n += 1) h.tg.addFile({ folder: root, name: `pista ${n}.mp3` });
  await call('POST', '/api/refresh'); await h.waitSync();
});
after(() => h.close());

const files = async () => (await call('GET', '/api/stats')).json;
const mediaIds = () => [...h.tg.messages.values()].filter((m) => m.media).map((m) => m.id);

test('borrar pocos elementos desde Telegram se refleja sin pedir confirmación', async () => {
  mediaIds().slice(0, 3).forEach((id) => h.tg.messages.delete(id));
  await call('POST', '/api/refresh'); await h.waitSync();
  const s = await files();
  assert.equal(s.files, 57);
  assert.equal(s.sync.pruneBlocked, null);
});

test('si Telegram "pierde" más de la mitad (búsqueda incompleta), no se poda hasta que el usuario lo confirma', async () => {
  const gone = mediaIds().slice(0, 40);
  gone.forEach((id) => h.tg.messages.delete(id));
  await call('POST', '/api/refresh'); await h.waitSync();
  const blocked = await files();
  assert.equal(blocked.files, 57, 'el índice no se toca');
  assert.deepEqual(blocked.sync.pruneBlocked, { stale: 40, known: 57 });
  assert.equal((await call('POST', '/api/refresh', { confirmPrune: 'sí' })).res.status, 202); // solo vale `true`
  await h.waitSync();
  assert.ok((await files()).sync.pruneBlocked);
  await call('POST', '/api/refresh', { confirmPrune: true }); await h.waitSync();
  const done = await files();
  assert.equal(done.files, 17);
  assert.equal(done.sync.pruneBlocked, null);
});
