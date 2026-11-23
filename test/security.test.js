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

test('todo archivo se sirve aislado con sandbox salvo audio, vídeo, imágenes de mapa de bits y PDF', async () => {
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

test('los nombres no pueden falsearse con marcas de dirección ni invisibles, y se normalizan', async () => {
  const mk = async (name) => (await call('POST', '/api/folders', { parent: '/', name })).json;
  assert.equal((await mk('foto‮gpj.exe')).path, '/fotogpj.exe'); // sin U+202E
  assert.equal((await mk('ha​la')).path, '/hala');
  assert.equal((await call('POST', '/api/folders', { parent: '/', name: '​‮' })).res.status, 400); // solo invisibles
  assert.equal((await mk('éx')).path, '/éx'); // NFC
  assert.equal((await mk('familia 👨‍👩‍👧')).path, '/familia 👨‍👩‍👧'); // el unir de emojis (U+200D) se respeta
  assert.equal((await mk('10 30')).path, '/10 30'); // espacio estrecho de las capturas de macOS
});

test('las respuestas de la API no se cachean y la política de seguridad limita los formularios', async () => {
  const r = await h.raw('/api/stats');
  assert.equal(r.headers.get('cache-control'), 'no-store');
  assert.match(r.headers.get('content-security-policy'), /form-action 'self'/);
  assert.match((await h.raw(`/api/files/${file.id}/content`)).headers.get('cache-control'), /private/); // los archivos mantienen su caché privada
});

test('cada inicio de sesión emite un token aleatorio diferente', async () => {
  const login = async () => (await call('POST', '/api/auth/login', { password: 'contraseña-de-prueba' })).res.headers.get('set-cookie').split(';')[0];
  const a = await login();
  const b = await login();
  assert.notEqual(a, b);
  assert.equal(a.split('=')[1].split('.').length, 3);
});

test('la profundidad y longitud de rutas se validan antes de crear o mover carpetas', async () => {
  const { validateFolderChange } = await import('../server/services/folder-limits.js');
  const tree = h.catalog.tree;
  const parent = tree.resolve('/');
  assert.equal(validateFolderChange(tree, parent, 'Seguro'), '/Seguro');
  assert.throws(() => validateFolderChange(tree, parent, 'x'.repeat(401)));
  const root = await call('POST', '/api/folders', { parent: '/', name: 'Auditoria' });
  assert.equal(root.res.status, 201);
  const tooLong = await call('POST', '/api/folders', { parent: '/Auditoria', name: 'x'.repeat(120) });
  assert.equal(tooLong.res.status, 201);
  const rejected = await call('POST', '/api/folders', { parent: '/Auditoria/' + 'x'.repeat(120), name: 'y'.repeat(120) });
  assert.equal(rejected.res.status, 201);
  const third = await call('POST', '/api/folders', { parent: '/Auditoria/' + 'x'.repeat(120) + '/' + 'y'.repeat(120), name: 'z'.repeat(120) });
  assert.equal(third.res.status, 201);
  const overflow = await call('POST', '/api/folders', { parent: '/Auditoria/' + 'x'.repeat(120) + '/' + 'y'.repeat(120) + '/' + 'z'.repeat(120), name: 'w'.repeat(120) });
  assert.equal(overflow.res.status, 400);
});

test('los tipos que no están en la lista blanca (XML, RSS, SVG, texto) también van aislados', async () => {
  const { isolated } = await import('../server/services/streamer.js');
  for (const type of ['text/html', 'application/rss+xml', 'application/atom+xml', 'image/svg+xml', 'text/plain', 'application/octet-stream', 'text/xsl']) {
    assert.equal(isolated(type), true, type);
  }
  for (const type of ['audio/mpeg', 'video/mp4', 'image/png', 'image/jpeg', 'application/pdf']) assert.equal(isolated(type), false, type);
});
