import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { makeHarness } from './helpers/harness.js';
import { createRepo } from '../server/features/music-downloads/repo.js';

const url = 'https://open.spotify.com/album/0VjIjW4GlUZAMYd2vXMi3b';

test('SpotDL usa la cola autenticada y sube las pistas a carpetas de artista/álbum', async () => {
  const h = await makeHarness();
  const { createService } = await import('../server/features/music-downloads/service.js');
  const spotify = {
    installed: async () => true,
    download: async (_url, dir, { onProgress }) => {
      const file = path.join(dir, 'track.mp3');
      await fs.writeFile(file, Buffer.alloc(512, 1));
      onProgress?.(75);
      return [
        { path: file, size: 512, artist: 'Prueba', album: 'Álbum', name: 'Tema.mp3' },
      ];
    },
  };
  const runner = { installed: async () => true };
  const service = createService({
    repo: createRepo(h.db), catalog: h.catalog, tmpDir: path.join(h.dataDir, 'tmp'), runner, spotify,
  });
  try {
    await h.login();
    service.start();
    const added = service.enqueueSpotify(url);
    assert.equal(added.accepted.length, 1);
    const id = added.accepted[0];
    let job;
    for (let i = 0; i < 100; i += 1) {
      job = (await service.status()).jobs.find((j) => j.id === id);
      if (['done', 'failed'].includes(job?.state)) break;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    assert.equal(job.state, 'done', job.error);
    assert.equal(job.destination, '/Descargas de Internet/Prueba/Álbum');
    const files = (await h.call('GET', '/api/list?path=' + encodeURIComponent(job.destination))).json.files;
    assert.equal(files.length, 1);
    assert.equal(files[0].name, 'Tema.mp3');
    assert.equal(service.enqueueSpotify(url).skipped.length, 1);
    const remote = await h.call('POST', '/api/music-downloads/spotify', {
      url,
    });
    assert.equal(remote.res.status, 202);
    assert.equal(remote.json.skipped.length, 1);
    const malicious = await h.call('POST', '/api/music-downloads/spotify', { url: 'http://127.0.0.1/admin' });
    assert.equal(malicious.res.status, 400);
  } finally {
    service.stop();
    h.close();
  }
});

test('SpotDL: una lista va a una sola carpeta con su nombre y el álbum conserva Artista/Álbum', async () => {
  const h = await makeHarness();
  await fs.mkdir(path.join(h.dataDir, 'tmp'), { recursive: true });
  const { createService } = await import('../server/features/music-downloads/service.js');
  const make = (playlist) => async (_url, dir) => {
    const file = path.join(dir, 'track.mp3');
    await fs.writeFile(file, Buffer.alloc(512, 1));
    return [
      { path: file, size: 512, artist: 'A', album: 'X', name: 'Uno.mp3', playlist },
      { path: file, size: 512, artist: 'B', album: 'Y', name: 'Dos.mp3', playlist },
    ];
  };
  const spotify = { installed: async () => true, download: make('Mi Lista') };
  const service = createService({
    repo: createRepo(h.db), catalog: h.catalog, tmpDir: path.join(h.dataDir, 'tmp'),
    runner: { installed: async () => true }, spotify,
  });
  const finish = async (id) => {
    let job;
    for (let i = 0; i < 100; i += 1) {
      job = (await service.status()).jobs.find((j) => j.id === id);
      if (['done', 'failed'].includes(job?.state)) break;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    return job;
  };
  try {
    await h.login();
    service.start();
    const list = await finish(service.enqueueSpotify('https://open.spotify.com/playlist/0VjIjW4GlUZAMYd2vXMi3b').accepted[0]);
    assert.equal(list.state, 'done', list.error);
    assert.equal(list.destination, '/Descargas de Internet/Listas/Mi Lista');
    assert.equal(list.title, 'Mi Lista');
    const files = (await h.call('GET', '/api/list?path=' + encodeURIComponent(list.destination))).json.files;
    assert.deepEqual(files.map((f) => f.name).sort(), ['Dos.mp3', 'Uno.mp3']);
    const album = await finish(service.enqueueSpotify('https://open.spotify.com/album/1VjIjW4GlUZAMYd2vXMi3b').accepted[0]);
    assert.equal(album.destination, '/Descargas de Internet/B/Y');
  } finally {
    service.stop();
    h.close();
  }
});
