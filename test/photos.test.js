import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeHarness } from './helpers/harness.js';
import { jpegWithExif } from './helpers/jpeg-exif.js';
import { parseExif, parseExifDate } from '../server/features/photos/exif.js';

test('EXIF: fecha, GPS y cámara', () => {
  const e = parseExif(jpegWithExif({ taken: '2024:07:15 18:30:05', lat: 40.4168, lon: -3.7038 }));
  assert.equal(e.taken, Date.UTC(2024, 6, 15, 18, 30, 5));
  assert.ok(Math.abs(e.lat - 40.4168) < 1e-3 && Math.abs(e.lon + 3.7038) < 1e-3);
  assert.equal(e.camera, 'Canon EOS 80D');
});
test('EXIF: hemisferios sur y oeste son negativos; sin GPS ni fecha', () => {
  const s = parseExif(jpegWithExif({ taken: '2020:01:02 03:04:05', lat: -33.8688, lon: 151.2093 }));
  assert.ok(s.lat < 0 && s.lon > 0);
  const none = parseExif(jpegWithExif({}));
  assert.deepEqual([none.taken, none.lat, none.lon], [0, null, null]);
});
test('EXIF: entradas inválidas o truncadas no lanzan', () => {
  assert.equal(parseExif(Buffer.from('no es una foto')), null);
  assert.equal(parseExif(Buffer.alloc(0)), null);
  const good = jpegWithExif({ taken: '2024:07:15 18:30:05', lat: 1, lon: 1 });
  for (let n = 0; n < good.length; n += 7) assert.doesNotThrow(() => parseExif(good.subarray(0, n)));
  assert.equal(parseExifDate('0000:00:00 00:00:00'), 0);
  assert.equal(parseExifDate('basura'), 0);
});

let h; let call; const ids = {};
before(async () => {
  h = await makeHarness(); call = h.call; await h.login();
  await call('POST', '/api/folders', { parent: '/', name: 'Fotos' });
  const folder = h.catalog.tree.resolve('/Fotos');
  ids.viejaConExif = h.tg.addFile({ folder, name: 'vieja.jpg', bytes: jpegWithExif({ taken: '2015:05:01 10:00:00', lat: 41.38, lon: 2.17 }) }).id;
  ids.nuevaConExif = h.tg.addFile({ folder, name: 'nueva.JPG', bytes: jpegWithExif({ taken: '2024:08:09 12:00:00' }) }).id;
  ids.sinExif = h.tg.addFile({ folder, name: 'sin.png', bytes: Buffer.from('png') }).id;
  await call('POST', '/api/refresh'); await h.waitSync();
});
after(() => h.close());

test('el análisis lee el EXIF y la línea de tiempo ordena por fecha de la toma', async () => {
  const before = (await call('GET', '/api/photos/status')).json;
  assert.deepEqual([before.images, before.jpeg, before.scanned], [3, 2, 0]);
  assert.equal((await call('POST', '/api/photos/scan')).res.status, 202);
  for (let i = 0; i < 100 && (await call('GET', '/api/photos/status')).json.scanned < 2; i += 1) await new Promise((r) => setTimeout(r, 25));
  const t = (await call('GET', '/api/photos/timeline')).json;
  assert.equal(t.total, 3);
  const nuevaIdx = t.photos.findIndex((p) => p.id === ids.nuevaConExif);
  const viejaIdx = t.photos.findIndex((p) => p.id === ids.viejaConExif);
  assert.ok(t.photos[0].takenAt >= t.photos[1].takenAt); // la de hoy (sin EXIF) va primero
  assert.ok(nuevaIdx < viejaIdx);
  const vieja = t.photos[viejaIdx];
  assert.deepEqual([vieja.exif, Math.round(vieja.lat), Math.round(vieja.lon)], [true, 41, 2]);
  assert.equal(vieja.parent, '/Fotos');
  assert.equal(t.photos.find((p) => p.id === ids.sinExif).exif, false);
});

test('paginación y validación', async () => {
  const p = (await call('GET', '/api/photos/timeline?offset=1&limit=1')).json;
  assert.equal(p.photos.length, 1);
  assert.equal(p.offset, 1);
  assert.equal((await call('GET', '/api/photos/timeline?offset=-5&limit=abc')).res.status, 200);
  assert.equal((await fetch(`${h.base}/api/photos/timeline`)).status, 401);
});
