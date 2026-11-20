import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { sourceUrl, classify } from '../server/features/music-downloads/metadata.js';
import { createRepo } from '../server/features/music-downloads/repo.js';
import { makeHarness } from './helpers/harness.js';
import { mp3WithTags } from './helpers/id3.js';

const SRC = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const OTHER = 'https://www.youtube.com/watch?v=BaW_jenozKc';

test('solo URLs HTTPS de YouTube, sin acceso a hosts internos', () => {
  assert.equal(sourceUrl(SRC).id, 'dQw4w9WgXcQ');
  assert.equal(sourceUrl('https://youtu.be/dQw4w9WgXcQ').url, SRC);
  assert.equal(sourceUrl('https://www.youtube.com/playlist?list=PL1234567890123').type, 'playlist');
  for (const url of ['http://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://127.0.0.1/test', 'https://www.youtube.com.evil.org/watch?v=dQw4w9WgXcQ',
    'https://example.com/watch?v=dQw4w9WgXcQ']) assert.throws(() => sourceUrl(url));
});

test('organización: artista / álbum, Singles y Por revisar; rutas limpiadas', () => {
  assert.equal(classify({ title: 'Tema', artist: 'Queen', album: 'Opera' }).parent, '/Descargas de Internet/Queen/Opera');
  assert.equal(classify({ title: 'Tema', artist: 'Queen' }).parent, '/Descargas de Internet/Queen/Singles');
  assert.equal(classify({ title: 'Tema' }).parent, '/Descargas de Internet/Por revisar');
  assert.equal(classify({ title: '../tema', artist: 'Rock/Clásico' }).parent, '/Descargas de Internet/Rock Clásico/Singles');
});

let h; let service; let calls = 0;
before(async () => {
  h = await makeHarness();
  await h.login();
  const runner = {
    installed: async () => true,
    inspect: async (url) => ({ items: [{ id: sourceUrl(url).id,
      title: 'Canción de prueba', artist: url.includes('dQw4') ? 'Artista demo' : '', album: url.includes('dQw4') ? 'Álbum demo' : '' }] }),
    download: async (url, dir, meta, { onProgress }) => {
      calls++;
      onProgress(50);
      const file = path.join(dir, 'final.mp3');
      const bytes = mp3WithTags({ title: meta.title, artist: meta.artist, album: meta.album });
      await fs.writeFile(file, bytes);
      return { path: file, size: bytes.length };
    },
  };
  const { createService } = await import('../server/features/music-downloads/service.js');
  service = createService({ repo: createRepo(h.db), catalog: h.catalog, tmpDir: path.join(h.dataDir, 'tmp'), runner });
  service.start();
});
after(() => { service?.stop(); h?.close(); });

async function finished(id) {
  for (let i = 0; i < 120; i++) {
    const job = (await service.status()).jobs.find((j) => j.id === id);
    if (['done', 'failed'].includes(job?.state)) return job;
    await new Promise((r) => setTimeout(r, 20));
  }
  throw new Error('La cola no terminó');
}

test('cola MP3: crea carpetas por artista y álbum, sube al Telegram simulado', async () => {
  const one = service.enqueue([{ url: SRC }]);
  assert.equal(one.accepted.length, 1);
  const job = await finished(one.accepted[0]);
  assert.equal(job.state, 'done', job.error);
  assert.equal(job.destination, '/Descargas de Internet/Artista demo/Álbum demo');
  const files = (await h.call('GET', '/api/list?path=' + encodeURIComponent(job.destination))).json.files;
  assert.equal(files.length, 1);
  assert.equal(files[0].kind, 'audio');
  assert.equal(files[0].name, 'Canción de prueba.mp3');
  assert.equal(job.fileId, files[0].id);
});

test('evita descargar el mismo ID mientras el archivo siga en Telegram', () => {
  const repeat = service.enqueue([{ url: SRC }]);
  assert.equal(repeat.accepted.length, 0);
  assert.deepEqual(repeat.skipped, ['dQw4w9WgXcQ']);
  assert.equal(calls, 1);
});

test('sin artista, crea Por revisar en vez de inventar metadatos', async () => {
  const second = service.enqueue([{ url: OTHER }]);
  const job = await finished(second.accepted[0]);
  assert.equal(job.state, 'done', job.error);
  assert.equal(job.destination, '/Descargas de Internet/Por revisar');
});

test('los trabajos y la raíz solo se consultan autenticado', async () => {
  assert.equal((await fetch(h.base + '/api/music-downloads')).status, 401);
  const own = (await h.call('GET', '/api/music-downloads')).json;
  assert.equal(own.root, '/Descargas de Internet');
  assert.ok(own.jobs.some((x) => x.state === 'done'));
});
