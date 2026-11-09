import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeHarness } from './helpers/harness.js';
import { rollUp } from '../server/features/usage/service.js';

test('rollUp acumula en los ancestros', () => {
  const parents = { 3: 2, 2: 1, 1: 0, 0: null };
  const total = rollUp(new Map([[3, { count: 1, bytes: 10 }], [2, { count: 2, bytes: 5 }]]), (id) => parents[id] ?? null);
  assert.deepEqual(total.get(1), { count: 3, bytes: 15 });
  assert.deepEqual(total.get(2), { count: 3, bytes: 15 });
  assert.deepEqual(total.get(3), { count: 1, bytes: 10 });
});

let h; let call;
before(async () => {
  h = await makeHarness(); call = h.call; await h.login();
  for (const [parent, name] of [['/', 'A'], ['/A', 'B'], ['/', 'C']]) await call('POST', '/api/folders', { parent, name });
  const at = (p) => h.catalog.tree.resolve(p);
  h.tg.addFile({ folder: at('/A'), name: 'x.png', bytes: Buffer.alloc(100) });
  h.tg.addFile({ folder: at('/A/B'), name: 'y.mp3', bytes: Buffer.alloc(300) });
  h.tg.addFile({ folder: at('/C'), name: 'z.mp3', bytes: Buffer.alloc(50) });
  h.tg.addFile({ folder: at('/C'), name: 'w.png', bytes: Buffer.alloc(7) });
  await call('POST', '/api/refresh'); await h.waitSync();
});
after(() => h.close());

test('uso por tipo, por carpeta (recursivo) y archivos más grandes', async () => {
  const r = (await call('GET', '/api/usage')).json;
  assert.deepEqual(r.total, { count: 4, bytes: 457 });
  assert.deepEqual(r.kinds.map((k) => [k.kind, k.count, k.bytes]), [['audio', 2, 350], ['image', 2, 107]]);
  assert.deepEqual(r.folders.map((f) => [f.path, f.bytes, f.ownBytes]), [['/A', 400, 100], ['/A/B', 300, 300], ['/C', 57, 57]]);
  assert.deepEqual(r.biggest.map((f) => f.name), ['y.mp3', 'x.png', 'z.mp3', 'w.png']);
  assert.equal(r.biggest[0].path, '/A/B');
  assert.deepEqual(r.trash, { count: 0, bytes: 0 });
});

test('la papelera cuenta aparte y no suma al total', async () => {
  const id = (await call('GET', '/api/list?path=/C')).json.files.find((f) => f.name === 'z.mp3').id;
  await call('DELETE', `/api/files/${id}`);
  const r = (await call('GET', '/api/usage')).json;
  assert.equal(r.total.bytes, 407);
  assert.deepEqual(r.trash, { count: 1, bytes: 50 });
  assert.equal((await fetch(`${h.base}/api/usage`)).status, 401);
});
