import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeHarness } from './helpers/harness.js';

let h; let call; let file; let html;
before(async () => {
  h = await makeHarness(); call = h.call; await h.login();
  const root = h.catalog.tree.resolve('/');
  file = h.tg.addFile({ folder: root, name: 'a.mp3', bytes: Buffer.alloc(100, 1) });
  html = h.tg.addFile({ folder: root, name: 'pagina.html', bytes: Buffer.from('<script>1</script>') });
  await call('POST', '/api/refresh'); await h.waitSync();
});
after(() => h.close());

test('CSRF: una petición que modifica algo desde otro origen se rechaza; el propio origen y las herramientas sin navegador pasan', async () => {
  const send = (headers) => call('POST', '/api/folders', { parent: '/', name: `c${Math.random()}` }, headers);
  assert.equal((await send({ 'sec-fetch-site': 'same-site' })).res.status, 403); // otro subdominio del mismo sitio
  assert.equal((await send({ 'sec-fetch-site': 'cross-site' })).res.status, 403);
  assert.equal((await send({ origin: 'https://otra.web' })).res.status, 403);
  assert.equal((await send({ 'sec-fetch-site': 'same-origin' })).res.status, 201);
  assert.equal((await send({ origin: h.base })).res.status, 201);
  assert.equal((await send({})).res.status, 201);
  assert.equal((await call('GET', '/api/stats', undefined, { 'sec-fetch-site': 'cross-site' })).res.status, 200); // las lecturas no se tocan
});

test('cerrar sesión invalida la cookie aunque alguien la hubiera copiado', async () => {
  const copy = (await call('POST', '/api/auth/login', { password: 'contraseña-de-prueba' })).res.headers.get('set-cookie').split(';')[0];
  const pub = (u, init = {}) => fetch(`${h.base}${u}`, { ...init, headers: { cookie: copy, ...init.headers } });
  assert.equal((await pub('/api/stats')).status, 200);
  assert.equal((await pub('/api/auth/logout', { method: 'POST' })).status, 200);
  assert.equal((await pub('/api/stats')).status, 401);
  const forged = `${copy.split('=')[0]}=abc.${copy.split('.')[1]}`;
  assert.equal((await pub('/api/stats', { headers: { cookie: forged } })).status, 401);
});

test('los documentos activos (HTML, SVG) se sirven aislados con sandbox; el audio no lleva esa cabecera', async () => {
  const doc = await h.raw(`/api/files/${html.id}/content`);
  assert.match(doc.headers.get('content-security-policy'), /^sandbox;/);
  const audio = await h.raw(`/api/files/${file.id}/content`);
  assert.doesNotMatch(audio.headers.get('content-security-policy'), /sandbox/);
  assert.equal(audio.headers.get('x-content-type-options'), 'nosniff');
});

test('parámetros hostiles no producen 500', async () => {
  assert.equal((await call('GET', '/api/list?kind[]=1&kind[]=2')).res.status, 200);
  assert.equal((await call('GET', '/api/list?kind[a]=b')).res.status, 200);
  assert.equal((await call('POST', '/api/files', { path: '/' })).res.status, 415); // JSON en vez de multipart
});

test('/healthz no revela detalles y en HTTPS se envía HSTS', async () => {
  const j = await (await fetch(`${h.base}/healthz`)).json();
  assert.deepEqual(Object.keys(j).sort(), ['ok', 'telegram']);
  const https = await fetch(`${h.base}/healthz`, { headers: { 'x-forwarded-proto': 'https' } });
  assert.match(https.headers.get('strict-transport-security') ?? '', /max-age/);
  assert.equal(https.headers.get('cross-origin-opener-policy'), 'same-origin');
});
