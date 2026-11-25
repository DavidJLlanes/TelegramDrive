import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeHarness } from './helpers/harness.js';

let h; let red; let blue;
const form = (image, paths, replace) => {
  const f = new FormData();
  f.set('paths', JSON.stringify(paths)); f.set('replace', replace ? '1' : '0');
  if (image) f.set('image', new Blob([image], { type: 'image/jpeg' }), 'portada.jpg');
  return f;
};
const listing = async () => (await h.call('GET', '/api/list?path=/')).json.folders;
const folder = async (name) => (await listing()).find((f) => f.name === name);

before(async () => {
  const sharp = (await import('sharp')).default;
  const make = (background) => sharp({ create: { width: 300, height: 200, channels: 3, background } }).jpeg().toBuffer();
  red = await make('#c33'); blue = await make('#33c');
  h = await makeHarness(); await h.login();
  for (const name of ['Rock', 'Jazz', 'Otra']) await h.call('POST', '/api/folders', { parent: '/', name });
});
after(() => h.close());

test('una carpeta sin imagen no la anuncia; con imagen aparece su versión y se sirve', async () => {
  assert.equal((await folder('Rock')).image, null);
  const { res, json } = await h.call('POST', '/api/folders/image', form(red, ['/Rock'], true));
  assert.equal(res.status, 200);
  assert.deepEqual(json, { updated: 1, skipped: 0 });
  const rock = await folder('Rock');
  assert.ok(Number.isInteger(rock.image) && rock.id);
  const img = await h.raw(`/api/folder-image/${rock.id}?v=${rock.image}`);
  assert.equal(img.status, 200);
  assert.equal(img.headers.get('content-type'), 'image/jpeg');
  assert.match(img.headers.get('cache-control'), /immutable/);
  const sharp = (await import('sharp')).default;
  const meta = await sharp(Buffer.from(await img.arrayBuffer())).metadata();
  assert.deepEqual([meta.width, meta.height], [900, 625], 'se ajusta a la proporción de la tarjeta');
});

test('en masa: respeta las que ya tienen salvo «sustituir»', async () => {
  const before = (await folder('Rock')).image;
  const keep = await h.call('POST', '/api/folders/image', form(blue, ['/Rock', '/Jazz', '/Otra', '/NoExiste'], false));
  assert.deepEqual(keep.json, { updated: 2, skipped: 1 });
  assert.equal((await folder('Rock')).image, before);
  const all = await h.call('POST', '/api/folders/image', form(blue, ['/Rock', '/Jazz'], true));
  assert.deepEqual(all.json, { updated: 2, skipped: 0 });
  assert.notEqual((await folder('Rock')).image, null);
});

test('quitar la imagen devuelve la carpeta a su aspecto normal; la raíz no se puede tocar', async () => {
  const r = await h.call('DELETE', '/api/folders/image', { paths: ['/Rock', '/'] });
  assert.deepEqual(r.json, { removed: 1 });
  assert.equal((await folder('Rock')).image, null);
  const rock = (await listing()).find((f) => f.name === 'Jazz');
  assert.equal((await h.raw(`/api/folder-image/${rock.id}`)).status, 200);
  assert.equal((await h.call('POST', '/api/folders/image', form(red, ['/'], true))).json.updated, 0);
});

test('rechaza imágenes ilegibles y peticiones vacías', async () => {
  assert.equal((await h.call('POST', '/api/folders/image', form(Buffer.from('no es imagen'), ['/Jazz'], true))).res.status, 422);
  assert.equal((await h.call('POST', '/api/folders/image', form(red, [], true))).res.status, 400);
});
