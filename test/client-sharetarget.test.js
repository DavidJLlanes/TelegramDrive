import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { takeShared, SHARE_CACHE } from '../public/js/features/share-target/store.js';

/** CacheStorage mínima en memoria. */
function fakeStorage() {
  const entries = new Map();
  const cache = {
    keys: async () => [...entries.keys()].map((url) => ({ url })),
    match: async (req) => entries.get(req.url),
    delete: async (req) => entries.delete(req.url),
    put: async (url, res) => { entries.set(url, res); },
  };
  return { entries, cache, open: async (name) => { assert.equal(name, SHARE_CACHE); return cache; } };
}
const res = (body, name, type) => new Response(body, { headers: { 'X-Filename': encodeURIComponent(name), 'Content-Type': type } });

test('devuelve los archivos en orden numérico con su nombre y tipo, y vacía la caché', async () => {
  const s = fakeStorage();
  await s.cache.put('https://x/shared-files/10', res('diez', 'ñandú 10.txt', 'text/plain'));
  await s.cache.put('https://x/shared-files/2', res('dos', 'foto dos.jpg', 'image/jpeg'));
  const files = await takeShared(s);
  assert.deepEqual(files.map((f) => [f.name, f.type, f.size]), [['foto dos.jpg', 'image/jpeg', 3], ['ñandú 10.txt', 'text/plain', 4]]);
  assert.equal(s.entries.size, 0);
  assert.deepEqual(await takeShared(s), []);
});
test('sin CacheStorage no falla', async () => assert.deepEqual(await takeShared(null), []));

test('el manifiesto declara el destino de compartir y el service worker lo atiende', () => {
  const manifest = JSON.parse(fs.readFileSync(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'));
  assert.equal(manifest.share_target.method, 'POST');
  assert.equal(manifest.share_target.enctype, 'multipart/form-data');
  assert.equal(manifest.share_target.params.files[0].name, 'files');
  assert.match(fs.readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8'), /importScripts\('sw-share-target\.js'\)/);
  assert.match(fs.readFileSync(new URL('../public/sw-share-target.js', import.meta.url), 'utf8'), /share-target/);
});
