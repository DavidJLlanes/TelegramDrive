import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeHarness } from './helpers/harness.js';

let h; let call; let file;
before(async () => {
  h = await makeHarness(); call = h.call; await h.login();
  file = h.tg.addFile({ folder: h.catalog.tree.resolve('/'), name: 'secreto.mp3', bytes: Buffer.alloc(4000, 7) });
  await call('POST', '/api/refresh'); await h.waitSync();
});
after(() => h.close());

const pub = (url, init = {}) => fetch(`${h.base}${url}`, { redirect: 'manual', ...init }); // sin cookie de sesión
const newShare = async () => (await call('POST', '/api/shares', { kind: 'file', target: String(file.id), duration: '1h' })).json;

test('sin política, el enlace funciona como siempre y el acceso queda registrado', async () => {
  const s = await newShare();
  const r = await pub(`/share/${s.token}`);
  assert.equal(r.status, 200);
  assert.equal((await r.arrayBuffer()).byteLength, 4000);
  const entries = (await call('GET', '/api/security/log?event=share')).json.entries;
  assert.ok(entries.some((e) => e.ok && e.event === 'share'));
});

test('la política se valida y exige sesión y un enlace existente', async () => {
  const s = await newShare();
  assert.equal((await call('PUT', `/api/shares/${s.token}/policy`, { password: 'abc' })).res.status, 400);
  assert.equal((await call('PUT', `/api/shares/${s.token}/policy`, { maxDownloads: -1 })).res.status, 400);
  assert.equal((await call('PUT', `/api/shares/${s.token}/policy`, { maxDownloads: 1.5 })).res.status, 400);
  assert.equal((await call('PUT', '/api/shares/inexistente/policy', { password: 'abcd' })).res.status, 404);
  assert.equal((await pub(`/api/shares/${s.token}/policy`, { method: 'PUT' })).status, 401);
  const ok = await call('PUT', `/api/shares/${s.token}/policy`, { password: 'abcd', maxDownloads: 3 });
  assert.deepEqual(ok.json, { protected: true, maxDownloads: 3, downloads: 0 });
  assert.equal((await call('GET', '/api/shares/policy')).json.policies[s.token].protected, true);
});

test('con contraseña: página de acceso, error si es incorrecta y cookie si es correcta', async () => {
  const s = await newShare();
  await call('PUT', `/api/shares/${s.token}/policy`, { password: 'abcd' });
  const gate = await pub(`/share/${s.token}`);
  assert.equal(gate.status, 200);
  assert.match(gate.headers.get('content-type'), /html/);
  const html = await gate.text();
  assert.match(html, /Enlace protegido/);
  assert.ok(!html.includes('<script'), 'la página no lleva scripts');

  const form = (password) => ({ method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: `password=${encodeURIComponent(password)}` });
  const bad = await pub(`/share/${s.token}/unlock`, form('xxxx'));
  assert.equal(bad.status, 401);
  assert.match(await bad.text(), /Contraseña incorrecta/);

  const good = await pub(`/share/${s.token}/unlock`, form('abcd'));
  assert.equal(good.status, 303);
  const cookie = good.headers.get('set-cookie').split(';')[0];
  assert.match(good.headers.get('set-cookie'), /HttpOnly/);
  const open = await pub(`/share/${s.token}`, { headers: { cookie } });
  assert.equal((await open.arrayBuffer()).byteLength, 4000);
  const forged = await pub(`/share/${s.token}`, { headers: { cookie: `${cookie.split('=')[0]}=9999999999999.falsa` } });
  assert.match(await forged.text(), /Enlace protegido/);
});

test('el límite cuenta descargas, no los trozos Range, y bloquea al agotarse', async () => {
  const s = await newShare();
  await call('PUT', `/api/shares/${s.token}/policy`, { maxDownloads: 2 });
  assert.equal((await pub(`/share/${s.token}`, { headers: { range: 'bytes=0-99' } })).status, 206);
  for (let i = 0; i < 5; i += 1) assert.equal((await pub(`/share/${s.token}`, { headers: { range: 'bytes=100-199' } })).status, 206); // no cuentan
  assert.equal((await pub(`/share/${s.token}`)).status, 200);
  const third = await pub(`/share/${s.token}`);
  assert.equal(third.status, 410);
  assert.match((await third.json()).error, /límite/);
  assert.equal((await call('GET', '/api/shares/policy')).json.policies[s.token].downloads, 2);
});

test('los enlaces anulados no dejan políticas huérfanas', async () => {
  const s = await newShare();
  await call('PUT', `/api/shares/${s.token}/policy`, { password: 'abcd' });
  await call('DELETE', `/api/shares/${s.token}`);
  assert.equal((await call('GET', '/api/shares/policy')).json.policies[s.token], undefined);
  assert.equal((await pub(`/share/${s.token}`)).status, 404);
});
