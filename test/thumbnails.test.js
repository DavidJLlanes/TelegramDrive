import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeHarness } from './helpers/harness.js';

let h; let call; let late; let never;
before(async () => {
  h = await makeHarness(); call = h.call; await h.login();
  const root = h.catalog.tree.resolve('/');
  late = h.tg.addFile({ folder: root, name: 'reciente.jpg', bytes: Buffer.alloc(50, 1) });
  never = h.tg.addFile({ folder: root, name: 'sin-miniatura.heic', bytes: Buffer.alloc(50, 2) });
  await call('POST', '/api/refresh'); await h.waitSync();
  // Telegram genera la miniatura de «reciente.jpg» más tarde: la consulta sin caché ya la ve; el mensaje cacheado no.
  h.tg.fresh = 0;
  h.tg.getMessage = async (id, opts = {}) => { if (opts.fresh) { h.tg.fresh += 1; if (id === late.id) late.hasThumb = true; } return h.tg.messages.get(id); };
  h.tg.downloadThumb = async (m) => (m.hasThumb ? Buffer.from('miniatura') : null);
});
after(() => h.close());

test('si Telegram aún no había generado la miniatura, se vuelve a mirar sin caché y se sirve', async () => {
  const r = await h.raw(`/api/files/${late.id}/thumb`);
  assert.equal(r.status, 200);
  assert.equal(await r.text(), 'miniatura');
  assert.equal(h.tg.fresh, 1);
  assert.equal((await h.raw(`/api/files/${late.id}/thumb`)).status, 200); // ya cacheada en disco: sin más consultas
  assert.equal(h.tg.fresh, 1);
});

test('sin miniatura en Telegram responde 404 (el cliente usa entonces la propia imagen)', async () => {
  assert.equal((await h.raw(`/api/files/${never.id}/thumb`)).status, 404);
});
