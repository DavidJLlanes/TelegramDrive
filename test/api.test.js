import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tgd-test-'));
process.env.DATA_DIR = dataDir;
process.env.BASE_PATH = '/telegram';
process.env.TG_API_ID = '1';
process.env.TG_API_HASH = 'x';
process.env.SESSION_SECRET = 'a'.repeat(64);

const { hashPassword } = await import('../server/utils/crypto.js');
process.env.APP_PASSWORD_HASH = hashPassword('contraseña-de-prueba');
const { ensureDirs } = await import('../server/config/index.js');
const { createApp } = await import('../server/app.js');
const { Catalog } = await import('../server/services/catalog.js');
const { FakeTelegram } = await import('./helpers/fake-telegram.js');

let server; let base; let cookie = '';
const call = async (method, url, body, headers = {}) => {
  const res = await fetch(`${base}${url}`, {
    method, headers: { cookie, ...(body && !(body instanceof FormData) ? { 'content-type': 'application/json' } : {}), ...headers },
    body: body instanceof FormData ? body : body && JSON.stringify(body),
  });
  const text = await res.text();
  let json = null; try { json = JSON.parse(text); } catch { /* binario */ }
  return { res, json, text };
};

before(async () => {
  ensureDirs();
  const tg = new FakeTelegram();
  server = createApp({ tg, catalog: new Catalog(tg) }).listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.close(); fs.rmSync(dataDir, { recursive: true, force: true }); });

test('la API exige sesión y el login rechaza contraseñas erróneas', async () => {
  assert.equal((await call('GET', '/api/list?path=/')).res.status, 401);
  assert.equal((await call('POST', '/api/auth/login', { password: 'mala' })).res.status, 401);
  const ok = await call('POST', '/api/auth/login', { password: 'contraseña-de-prueba' });
  assert.equal(ok.res.status, 200);
  const setCookie = ok.res.headers.get('set-cookie');
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /Path=\/telegram/);
  cookie = setCookie.split(';')[0];
  assert.equal((await call('GET', '/api/auth/status')).json.authenticated, true);
});

test('carpetas: crear, duplicado, anidar, renombrar y mover', async () => {
  assert.equal((await call('POST', '/api/folders', { parent: '/', name: 'Música' })).res.status, 201);
  assert.equal((await call('POST', '/api/folders', { parent: '/', name: 'música' })).res.status, 409);
  assert.equal((await call('POST', '/api/folders', { parent: '/Música', name: 'Rock' })).res.status, 201);
  assert.equal((await call('POST', '/api/folders', { parent: '/', name: '../x' })).res.status, 400);
  const ren = await call('PATCH', '/api/folders', { path: '/Música/Rock', name: 'Rock clásico' });
  assert.equal(ren.json.path, '/Música/Rock clásico');
  const mv = await call('PATCH', '/api/folders', { path: '/Música/Rock clásico', parent: '/' });
  assert.equal(mv.json.path, '/Rock clásico');
  const into = await call('PATCH', '/api/folders', { path: '/Música', parent: '/Música' });
  assert.equal(into.res.status, 400);
  const list = await call('GET', '/api/list?path=/');
  assert.deepEqual(list.json.folders.map((f) => f.name).sort(), ['Música', 'Rock clásico']);
});

test('subida, listado, streaming con Range, descarga, renombrar, mover y borrar', async () => {
  const payload = Buffer.from('0123456789abcdefghij');
  const form = new FormData();
  form.append('path', '/Música');
  form.append('file', new Blob([payload]), 'tema.mp3');
  const up = await call('POST', '/api/files', form);
  assert.equal(up.res.status, 201);
  assert.equal(up.json.kind, 'audio');
  const id = up.json.id;

  const listed = await call('GET', '/api/list?path=/M%C3%BAsica');
  assert.equal(listed.json.files[0].name, 'tema.mp3');

  const full = await call('GET', `/api/files/${id}/content`);
  assert.equal(full.text, payload.toString());
  assert.equal(full.res.headers.get('accept-ranges'), 'bytes');

  const part = await call('GET', `/api/files/${id}/content`, null, { range: 'bytes=5-9' });
  assert.equal(part.res.status, 206);
  assert.equal(part.text, '56789');
  assert.equal(part.res.headers.get('content-range'), 'bytes 5-9/20');
  assert.equal((await call('GET', `/api/files/${id}/content`, null, { range: 'bytes=99-' })).res.status, 416);

  const dl = await call('GET', `/api/files/${id}/content?download=1`);
  assert.match(dl.res.headers.get('content-disposition'), /^attachment;/);

  assert.equal((await call('PATCH', `/api/files/${id}`, { name: 'nuevo.mp3' })).json.name, 'nuevo.mp3');
  assert.equal((await call('PATCH', `/api/files/${id}`, { parent: '/Rock clásico' })).json.parent, '/Rock clásico');
  assert.equal((await call('GET', '/api/search?q=nuevo')).json.files.length, 1);

  const dup = new FormData();
  dup.append('path', '/Rock clásico');
  dup.append('file', new Blob([payload]), 'nuevo.mp3');
  assert.equal((await call('POST', '/api/files', dup)).json.name, 'nuevo (1).mp3');

  assert.equal((await call('DELETE', `/api/files/${id}`)).res.status, 204);
  assert.equal((await call('GET', `/api/files/${id}/content`)).res.status, 404);
});

test('borrar carpeta elimina su contenido y la PWA se sirve con cabeceras seguras', async () => {
  const del = await call('DELETE', '/api/folders?path=/Rock%20cl%C3%A1sico');
  assert.ok(del.json.deleted >= 1);
  assert.equal((await call('GET', '/api/list?path=/Rock%20cl%C3%A1sico')).res.status, 404);
  const index = await call('GET', '/');
  assert.equal(index.res.status, 200);
  assert.match(index.res.headers.get('content-security-policy'), /default-src 'self'/);
  const sw = await call('GET', '/sw.js');
  assert.equal(sw.res.headers.get('cache-control'), 'no-cache');
  assert.equal((await call('GET', '/manifest.webmanifest')).res.status, 200);
});
