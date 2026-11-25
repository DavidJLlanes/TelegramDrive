import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeHarness } from './helpers/harness.js';
import { mp3WithTags } from './helpers/id3.js';

let h; let red; let blue; let withCover; let a; let b; const missing = 999999;
const form = (image, ids, replace) => {
  const f = new FormData();
  f.set('ids', JSON.stringify(ids)); f.set('replace', replace ? '1' : '0');
  if (image) f.set('image', new Blob([image], { type: 'image/jpeg' }), 'portada.jpg');
  return f;
};
const thumb = async (id) => Buffer.from(await (await h.raw(`/api/files/${id}/thumb`)).arrayBuffer());

before(async () => {
  const sharp = (await import('sharp')).default;
  const make = (background) => sharp({ create: { width: 80, height: 80, channels: 3, background } }).jpeg().toBuffer();
  red = await make('#c33'); blue = await make('#33c');
  h = await makeHarness(); await h.login();
  const root = h.catalog.tree.resolve('/');
  withCover = h.tg.addFile({ folder: root, name: 'con.mp3', bytes: mp3WithTags({ title: 'A', artist: 'X', album: 'Y' }, { cover: red }) });
  a = h.tg.addFile({ folder: root, name: 'a.mp3', bytes: mp3WithTags({ title: 'B' }) });
  b = h.tg.addFile({ folder: root, name: 'b.mp3', bytes: mp3WithTags({ title: 'C' }) });
  await h.call('POST', '/api/refresh'); await h.waitSync(); await h.catalog.tagger.promise;
});
after(() => h.close());

test('asigna una imagen a varias pistas sin tocar las que ya tienen carátula', async () => {
  const before = await thumb(withCover.id);
  const { res, json } = await h.call('POST', '/api/covers/assign', form(blue, [withCover.id, a.id, b.id, missing], false));
  assert.equal(res.status, 200);
  assert.deepEqual(json, { updated: 2, skipped: 2 }, 'la que ya tenía y la que no existe se omiten');
  assert.equal(h.catalog.getFile(a.id).thumb, true);
  assert.ok((await thumb(a.id)).equals(await thumb(b.id)));
  assert.ok(before.equals(await thumb(withCover.id)));
});

test('con «sustituir» cambia también las que ya tenían y la miniatura nueva se sirve al momento', async () => {
  const old = await thumb(a.id);
  const r1 = await h.raw(`/api/files/${a.id}/thumb`);
  assert.match(r1.headers.get('cache-control'), /no-cache/);
  const { json } = await h.call('POST', '/api/covers/assign', form(red, [a.id, withCover.id], true));
  assert.deepEqual(json, { updated: 2, skipped: 0 });
  assert.ok(!old.equals(await thumb(a.id)));
});

test('rechaza imágenes ilegibles, peticiones sin pistas y sin imagen', async () => {
  const bad = await h.call('POST', '/api/covers/assign', form(Buffer.from('no soy una imagen'), [a.id], true));
  assert.equal(bad.res.status, 422);
  assert.equal((await h.call('POST', '/api/covers/assign', form(red, [], true))).res.status, 400);
  assert.equal((await h.call('POST', '/api/covers/assign', form(null, [a.id], true))).res.status, 400);
  assert.equal((await h.call('POST', '/api/covers/assign', { ids: [a.id] })).res.status, 415);
});
