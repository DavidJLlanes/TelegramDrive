import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.document = { baseURI: 'http://localhost/telegram/' };
let calls = 0; let mode = 'found';
globalThis.fetch = async () => {
  calls += 1;
  await new Promise((r) => setTimeout(r, 10));
  if (mode === 'error') return new Response('{"error":"x"}', { status: 503 });
  return new Response(JSON.stringify({ state: 'found', lyrics: { text: 'hola', source: 'lrclib' } }), { status: 200 });
};
const { ensureLyrics } = await import('../public/js/features/lyrics/auto.js');

test('varias peticiones simultáneas de la misma canción hacen una sola búsqueda', async () => {
  calls = 0;
  const [a, b, c] = await Promise.all([1, 2, 3].map(() => ensureLyrics({ id: 7, kind: 'audio' })));
  assert.equal(calls, 1);
  assert.equal(a.text, 'hola'); assert.equal(b, a); assert.equal(c, a);
});

test('lo que no es una canción no se busca; un fallo del servidor da null y se puede reintentar', async () => {
  calls = 0;
  assert.equal(await ensureLyrics({ id: 8, kind: 'image' }), null);
  assert.equal(await ensureLyrics(null), null);
  assert.equal(calls, 0);
  mode = 'error';
  assert.equal(await ensureLyrics({ id: 9, kind: 'audio' }), null);
  mode = 'found';
  assert.equal((await ensureLyrics({ id: 9, kind: 'audio' })).text, 'hola');
  assert.equal(calls, 2);
});
