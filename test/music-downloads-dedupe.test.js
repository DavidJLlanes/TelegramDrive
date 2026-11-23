import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alreadyDownloaded, songAlreadyUploaded } from '../server/features/music-downloads/dedupe.js';
import { normalizeOptions } from '../server/features/music-downloads/options.js';

const present = { getFile: () => ({}) };
const gone = { getFile: () => { throw new Error('no existe'); } };
const job = (folder) => ({ fileId: 7, optionsJson: JSON.stringify(folder ? { folder } : {}) });

test('misma fuente y misma carpeta: se omite; otra carpeta propia: se puede volver a descargar', () => {
  assert.equal(alreadyDownloaded(job(), normalizeOptions({}), present), true);
  assert.equal(alreadyDownloaded(job('Rock'), normalizeOptions({ folder: 'rock' }), present), true);
  assert.equal(alreadyDownloaded(job(), normalizeOptions({ folder: 'Rock' }), present), false);
  assert.equal(alreadyDownloaded(job('Rock'), normalizeOptions({ folder: 'Jazz' }), present), false);
  assert.equal(alreadyDownloaded(job('Rock'), normalizeOptions({}), present), false);
});

test('si el archivo descargado ya no existe, se puede volver a descargar', () => {
  assert.equal(alreadyDownloaded(job(), normalizeOptions({}), gone), false);
  assert.equal(alreadyDownloaded(null, normalizeOptions({}), present), false);
});

const catalogWith = (row) => ({ fileOps: { existing: () => row } });
const song = { name: 'Saetas.mp3', artist: 'Quëreles' };

test('reintento: una canción ya subida se salta, salvo que sea de otro artista con el mismo título', () => {
  assert.equal(songAlreadyUploaded(catalogWith(null), '/x', song), false);
  assert.equal(songAlreadyUploaded(catalogWith({ id: 1, tagged: 0 }), '/x', song), true);
  assert.equal(songAlreadyUploaded(catalogWith({ id: 1, tagged: 1, artist: 'quëreles', band: '' }), '/x', song), true);
  assert.equal(songAlreadyUploaded(catalogWith({ id: 1, tagged: 1, artist: 'Otro', band: 'Otro' }), '/x', song), false);
});

test('fileOps.existing encuentra un archivo ya subido en la carpeta destino', async () => {
  const { makeHarness } = await import('./helpers/harness.js');
  const h = await makeHarness();
  try {
    await h.login();
    h.tg.addFile({ folder: h.catalog.tree.resolve('/'), name: 'Saetas.mp3', bytes: Buffer.alloc(200, 1) });
    await h.call('POST', '/api/refresh'); await h.waitSync();
    assert.ok(h.catalog.fileOps.existing('/', 'Saetas.mp3'));
    assert.equal(h.catalog.fileOps.existing('/', 'Otra.mp3'), null);
    assert.equal(songAlreadyUploaded(h.catalog, '/', { name: 'Saetas.mp3', artist: 'X' }), true);
  } finally { h.close(); }
});
