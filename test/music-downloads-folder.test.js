import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { makeHarness } from './helpers/harness.js';
import { createRepo } from '../server/features/music-downloads/repo.js';

test('SpotDL: con carpeta indicada todo va a Descargas de Internet/<carpeta>; sin ella, como siempre', async () => {
  const h = await makeHarness();
  await fs.mkdir(path.join(h.dataDir, 'tmp'), { recursive: true });
  const { createService } = await import('../server/features/music-downloads/service.js');
  const spotify = { installed: async () => true, download: async (_url, dir) => {
    const file = path.join(dir, 'track.mp3');
    await fs.writeFile(file, Buffer.alloc(512, 1));
    return [{ path: file, size: 512, artist: 'A', album: 'X', name: 'Uno.mp3', playlist: 'Mi Lista' }];
  } };
  const service = createService({ repo: createRepo(h.db), catalog: h.catalog, tmpDir: path.join(h.dataDir, 'tmp'),
    runner: { installed: async () => true }, spotify });
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
    const withFolder = await finish(service.enqueueSpotify('https://open.spotify.com/playlist/AAAAAAAAAAAAAAAAAAAAP1', 'Mi Fiesta').accepted[0]);
    assert.equal(withFolder.state, 'done', withFolder.error);
    assert.equal(withFolder.destination, '/Descargas de Internet/Mi Fiesta');
    const plain = await finish(service.enqueueSpotify('https://open.spotify.com/track/AAAAAAAAAAAAAAAAAAAAT2', '').accepted[0]);
    assert.equal(plain.destination, '/Descargas de Internet/A/X');
    assert.throws(() => service.enqueueSpotify('https://open.spotify.com/track/AAAAAAAAAAAAAAAAAAAAB3', '..'));
  } finally {
    service.stop();
    h.close();
  }
});
