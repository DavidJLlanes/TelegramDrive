import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spotifySource } from '../server/features/music-downloads/spotify-source.js';
import { manifestCount, spotdlFiles } from '../server/features/music-downloads/spotdl-files.js';

const ID = '0VjIjW4GlUZAMYd2vXMi3b';
test('Spotify: canonicaliza canciones, álbumes y listas sin parámetros de seguimiento', () => {
  for (const type of ['track', 'album', 'playlist']) {
    const url = 'https://open.spotify.com/' + type + '/' + ID;
    assert.deepEqual(spotifySource(url + '?si=unused'), { type, id: 'spotify:' + type + ':' + ID, url });
    assert.equal(spotifySource('https://open.spotify.com/intl-es/' + type + '/' + ID).url, url);
  }
});

test('Spotify: bloquea SSRF, credenciales, puertos y rutas no admitidas', () => {
  for (const value of [
    'http://open.spotify.com/track/' + ID,
    'https://open.spotify.com.evil.test/track/' + ID,
    'https://user:secret@open.spotify.com/track/' + ID,
    'https://open.spotify.com:8080/track/' + ID,
    'https://127.0.0.1/track/' + ID,
    'https://open.spotify.com/artist/' + ID,
    'https://open.spotify.com/playlist/' + ID + '/extra',
    'https://open.spotify.com/track/' + ID + '#fragment',
    'https://open.spotify.com/track/invalid',
  ]) assert.throws(() => spotifySource(value), value);
});

test('SpotDL: rechaza listas excesivas o manifiestos mal formados', () => {
  assert.equal(manifestCount(JSON.stringify([{ title: 'A' }, { title: 'B' }])), 2);
  assert.throws(() => manifestCount('invalid'));
  assert.throws(() => manifestCount('[]'));
  assert.throws(() => manifestCount(JSON.stringify(Array.from({ length: 151 }, () => ({ title: 'x' })))));
});

test('SpotDL: recoge música en Artista/Álbum y rechaza ficheros peligrosos', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'spotdl-files-'));
  try {
    const folder = path.join(root, 'Artista', 'Disco');
    await fs.mkdir(folder, { recursive: true });
    await fs.writeFile(path.join(folder, 'Tema.mp3'), Buffer.alloc(512));
    await fs.writeFile(path.join(root, 'songs.spotdl'), '[]');
    const files = await spotdlFiles(root);
    assert.equal(files.length, 1);
    assert.deepEqual([files[0].artist, files[0].album, files[0].name], ['Artista', 'Disco', 'Tema.mp3']);
    await fs.symlink('/etc/passwd', path.join(folder, 'falso.mp3'));
    await assert.rejects(spotdlFiles(root), /simbólico/);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});
