import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeHarness } from './helpers/harness.js';
import { mp3WithTags } from './helpers/id3.js';

let h; let withCover; let without; let jpeg;
const wait = async (cond) => { for (let i = 0; i < 100 && !(await cond()); i += 1) await new Promise((r) => setTimeout(r, 50)); };

before(async () => {
  const sharp = (await import('sharp')).default;
  jpeg = await sharp({ create: { width: 64, height: 64, channels: 3, background: '#c33' } }).jpeg().toBuffer();
  h = await makeHarness(); await h.login();
  const root = h.catalog.tree.resolve('/');
  withCover = h.tg.addFile({ folder: root, name: 'con.mp3', bytes: mp3WithTags({ title: 'A', artist: 'Quëreles', album: 'MESTIZA' }, { cover: jpeg }) });
  without = h.tg.addFile({ folder: root, name: 'sin.mp3', bytes: mp3WithTags({ title: 'B', artist: 'Otro', album: 'Sin Imagen' }) });
  await h.call('POST', '/api/refresh'); await h.waitSync(); await h.catalog.tagger.promise;
});
after(() => h.close());

test('carátula incrustada: el lector la guarda y /thumb la sirve como imagen', async () => {
  assert.equal(h.catalog.getFile(withCover.id).thumb, true);
  const r = await h.raw(`/api/files/${withCover.id}/thumb`);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('content-type'), 'image/jpeg');
  assert.ok((await r.arrayBuffer()).byteLength > 100);
  assert.equal(h.catalog.getFile(without.id).thumb, false);
  assert.equal((await h.raw(`/api/files/${without.id}/thumb`)).status, 404);
});

test('releer carátulas: recupera las marcadas sin portada y busca fuera las que faltan', async () => {
  // Simula el estado antiguo: la carátula incrustada quedó marcada como «sin portada».
  h.catalog.repo.db.stmt('UPDATE files SET thumb = 0 WHERE msg_id = ?').run(withCover.id);
  const calls = [];
  const { createService } = await import('../server/features/cover-rescan/service.js');
  const rescan = createService({
    files: h.catalog.repo, tree: h.catalog.tree, tagger: h.catalog.tagger, pause: 0,
    find: async (artist, album) => { calls.push(`${artist}|${album}`); return jpeg; },
  });
  assert.equal(rescan.start({ folder: '/' }), true);
  assert.equal(rescan.start({ folder: '/' }), false, 'no admite dos ejecuciones a la vez');
  await wait(() => !rescan.state().running);
  assert.equal(h.catalog.getFile(withCover.id).thumb, true, 'releída desde el archivo');
  assert.equal(h.catalog.getFile(without.id).thumb, true, 'encontrada en internet');
  assert.deepEqual(calls, ['Otro|Sin Imagen'], 'solo se busca lo que no tenía carátula');
  assert.equal(rescan.state().found, 1);
});

test('la ruta POST /api/covers/rescan arranca la tarea y GET informa del estado', async () => {
  const started = await h.call('POST', '/api/covers/rescan', { folder: '/', lookup: false });
  assert.equal(started.res.status, 202);
  assert.equal(started.json.running, true);
  await wait(async () => !(await h.call('GET', '/api/covers/rescan')).json.running);
  const state = (await h.call('GET', '/api/covers/rescan')).json;
  assert.equal(state.running, false);
  assert.equal(state.total, 2);
});

test('releer no oculta las canciones de la biblioteca mientras trabaja', async () => {
  let seenDuring = null;
  const { createService } = await import('../server/features/cover-rescan/service.js');
  const slow = { reread: async (rows, tick) => { seenDuring = h.catalog.getFile(withCover.id).tags?.title; rows.forEach(tick); } };
  const rescan = createService({ files: h.catalog.repo, tree: h.catalog.tree, tagger: slow, pause: 0, find: async () => null });
  rescan.start({ folder: '/', lookup: false });
  await wait(() => !rescan.state().running);
  assert.equal(seenDuring, 'A', 'la canción sigue etiquetada durante la relectura');
  assert.equal(h.catalog.repo.db.stmt("SELECT COUNT(*) AS n FROM files WHERE kind = 'audio' AND tagged = 0").get().n, 0);
});

test('si Telegram falla varias veces seguidas, la relectura se detiene con un aviso', async () => {
  const { Tagger } = await import('../server/services/tagger.js');
  const tg = { getMessage: async () => { throw new Error('sin red'); } };
  const tagger = new Tagger({ tg, files: h.catalog.repo });
  const rows = Array.from({ length: 20 }, (_, i) => ({ id: 900 + i, name: `x${i}.mp3` }));
  await assert.rejects(() => tagger.reread(rows), /Telegram no responde/);
});
