import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeHarness } from './helpers/harness.js';

let h; let call;
before(async () => {
  h = await makeHarness(); call = h.call; await h.login();
  await call('POST', '/api/folders', { parent: '/', name: 'Fotos' });
  await call('POST', '/api/folders', { parent: '/Fotos', name: 'Viaje' });
  h.tg.addFile({ folder: h.catalog.tree.resolve('/Fotos'), name: 'Playa.png', bytes: Buffer.alloc(100, 1) });
  h.tg.addFile({ folder: h.catalog.tree.resolve('/Fotos/Viaje'), name: 'mapa.png', bytes: Buffer.alloc(250, 1) });
  await call('POST', '/api/refresh'); await h.waitSync();
});
after(() => h.close());

const check = (body) => call('POST', '/api/files/check', body);

test('distingue iguales (mismo nombre y tamaño), distintos y nuevos, sin importar mayúsculas', async () => {
  const r = await check({ parent: '/Fotos', items: [{ name: 'playa.PNG', size: 100 }, { name: 'Playa.png', size: 999 }, { name: 'nueva.png', size: 5 }] });
  assert.deepEqual(r.json, { same: [0], differs: [1] });
});

test('resuelve subcarpetas relativas y las que aún no existen', async () => {
  const r = await check({ parent: '/Fotos', items: [{ dir: 'Viaje', name: 'mapa.png', size: 250 }, { dir: 'Otra/Nueva', name: 'mapa.png', size: 250 }, { dir: '../..', name: 'x', size: 1 }] });
  assert.deepEqual(r.json, { same: [0], differs: [] });
});

test('valida la entrada y exige sesión', async () => {
  assert.equal((await check({ items: 'no' })).res.status, 400);
  assert.equal((await check({ items: [{ name: 5, size: 1 }] })).res.status, 400);
  assert.equal((await check({ items: [{ name: 'a', size: 'x' }] })).res.status, 400);
  assert.equal((await check({ parent: 7, items: [] })).res.status, 200);
  assert.equal((await fetch(`${h.base}/api/files/check`, { method: 'POST' })).status, 401);
});
