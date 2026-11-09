import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { makeHarness } from './helpers/harness.js';
import { mp3WithTags } from './helpers/id3.js';

let h; let call;
const folderId = (p) => h.catalog.tree.resolve(p);

before(async () => {
  h = await makeHarness();
  call = h.call;
  await h.login();
  for (const [parent, name] of [['/', 'Música'], ['/Música', 'Rock'], ['/Música', 'Jazz']]) {
    await call('POST', '/api/folders', { parent, name });
  }
  const add = (folder, name, tags) => h.tg.addFile({ folder: folderId(folder), name, bytes: mp3WithTags(tags) });
  add('/Música/Rock', 'b.mp3', { title: 'Segunda', artist: 'Los Fugitivos', album: 'Disco Uno', track: '2/3', genre: 'Rock', year: '1999' });
  add('/Música/Rock', 'a.mp3', { title: 'Primera', artist: 'Los Fugitivos', album: 'Disco Uno', track: '1/3', genre: 'Rock', year: '1999' });
  add('/Música/Rock', 'c.mp3', { title: 'Solo', artist: 'los fugitivos', album: 'Otro disco', track: '1', genre: 'Rock' });
  add('/Música/Jazz', 'j.mp3', { title: 'Azul', artist: 'Trío Sur', album: 'Noche', band: 'Varios', track: '1', genre: 'Jazz' });
  h.tg.addFile({ folder: folderId('/Música'), name: 'sin-etiquetas.mp3', size: 20 });
  await call('POST', '/api/refresh');
  await h.waitSync();
  await h.catalog.tagger.promise;
});
after(() => h.close());

test('las etiquetas se leen en segundo plano y salen en el DTO', async () => {
  const { json } = await call('GET', '/api/list?path=/Música/Rock&kind=audio');
  const primera = json.files.find((f) => f.name === 'a.mp3');
  assert.deepEqual(primera.tags, { title: 'Primera', artist: 'Los Fugitivos', album: 'Disco Uno', band: 'Los Fugitivos', genre: 'Rock', track: 1, disc: 0, year: 1999 });
  const stats = (await call('GET', '/api/stats')).json;
  assert.equal(stats.tagging.pending, 0);
});

test('un audio sin etiquetas legibles no rompe nada y no entra en la biblioteca', async () => {
  const root = (await call('GET', '/api/list?path=/Música&kind=audio')).json.files;
  assert.equal(root.find((f) => f.name === 'sin-etiquetas.mp3').tags, undefined);
  const all = (await call('GET', '/api/library/tracks')).json.files;
  assert.equal(all.length, 4);
});

test('la cola de una carpeta es recursiva y se ordena por disco y pista', async () => {
  const q = (await call('GET', '/api/queue?path=/Música&recursive=1')).json.files;
  assert.equal(q.length, 5);
  const rock = (await call('GET', '/api/queue?path=/Música/Rock')).json.files.map((f) => f.name);
  assert.deepEqual(rock, ['a.mp3', 'c.mp3', 'b.mp3']); // pista 1, pista 1 (por nombre), pista 2
  assert.equal((await call('GET', '/api/queue?path=/Música')).json.files.length, 1); // sin recursión: solo su nivel
  assert.equal((await call('GET', '/api/queue?path=/No existe')).res.status, 404);
});

test('artistas, álbumes y géneros se agrupan sin distinguir mayúsculas', async () => {
  const artists = (await call('GET', '/api/library/artists')).json.artists;
  assert.deepEqual(artists.map((a) => [a.name.toLowerCase(), a.albums, a.tracks]), [['los fugitivos', 2, 3], ['varios', 1, 1]]);
  const albums = (await call('GET', '/api/library/albums')).json.albums;
  assert.deepEqual(albums.map((a) => a.album), ['Disco Uno', 'Noche', 'Otro disco']);
  assert.equal(albums[0].year, 1999);
  const byBand = (await call('GET', `/api/library/albums?artist=${encodeURIComponent('Los Fugitivos')}`)).json.albums;
  assert.equal(byBand.length, 2);
  assert.deepEqual((await call('GET', '/api/library/genres')).json.genres.map((g) => [g.name, g.tracks]), [['Jazz', 1], ['Rock', 3]]);
});

test('las canciones de un álbum salen por orden de pista', async () => {
  const q = `artist=${encodeURIComponent('Los Fugitivos')}&album=${encodeURIComponent('Disco Uno')}`;
  const tracks = (await call('GET', `/api/library/tracks?${q}`)).json.files;
  assert.deepEqual(tracks.map((t) => t.tags.title), ['Primera', 'Segunda']);
});

test('una base de datos v2 se migra añadiendo las columnas de etiquetas', async () => {
  const { DatabaseSync } = await import('node:sqlite');
  const file = path.join(os.tmpdir(), `tgd-v2-${Date.now()}.db`);
  const old = new DatabaseSync(file);
  old.exec(`CREATE TABLE files (msg_id INTEGER PRIMARY KEY, folder TEXT NOT NULL, name TEXT NOT NULL COLLATE NOCASE, key TEXT NOT NULL,
    size INTEGER NOT NULL, mime TEXT NOT NULL, kind TEXT NOT NULL, date INTEGER NOT NULL, thumb INTEGER NOT NULL DEFAULT 0);
    INSERT INTO files VALUES (1, 'root', 'x.mp3', 'x.mp3', 1, 'audio/mpeg', 'audio', 0, 0); PRAGMA user_version = 2;`);
  old.close();
  const { openDatabase } = await import('../server/db/database.js');
  const db = openDatabase(file);
  const row = db.stmt('SELECT tagged, band FROM files WHERE msg_id = 1').get();
  assert.deepEqual({ ...row }, { tagged: 0, band: '' });
  db.close();
  fs.rmSync(file, { force: true });
});
