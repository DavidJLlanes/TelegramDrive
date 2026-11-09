import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeHarness } from './helpers/harness.js';
import { mp3WithTags } from './helpers/id3.js';
import { analyze, nameKey, missingTracks } from '../server/features/library-audit/analysis.js';

test('nameKey ignora acentos, signos y orden de palabras', () => {
  assert.equal(nameKey('Faroles, Los'), nameKey('los faroles'));
  assert.equal(nameKey('Trío Sur'), nameKey('TRIO SUR'));
  assert.notEqual(nameKey('Los Faroles'), nameKey('Los Farolitos'));
});

test('missingTracks por disco', () => {
  assert.deepEqual(missingTracks([{ track: 1, disc: 1 }, { track: 4, disc: 1 }, { track: 1, disc: 2 }, { track: 2, disc: 2 }]), [{ disc: 1, track: 2 }, { disc: 1, track: 3 }]);
  assert.deepEqual(missingTracks([{ track: 0, disc: 0 }]), []);
});

test('analyze: álbumes incompletos, repetidas, mezclados, variantes y sin etiquetas', () => {
  const row = (id, o) => ({ id, folder: 1, name: `${id}.mp3`, tagged: 1, title: 't', artist: 'A', band: 'A', album: 'Disco', track: 0, disc: 0, year: 2000, ...o });
  const rows = [
    row(1, { track: 1 }), row(2, { track: 3 }), row(3, { track: 3, year: 2001 }),
    row(4, { folder: 2, album: 'Otro', artist: 'Faroles, Los', band: 'Faroles, Los', track: 1 }),
    row(5, { folder: 2, album: 'Otro', artist: 'Los Faroles', band: 'Los Faroles', track: 2 }),
    row(6, { folder: 3, tagged: 2, album: '' }), row(7, { folder: 3, tagged: 0, album: '' }),
  ];
  const r = analyze(rows, (f) => `/Música/${f}`);
  assert.deepEqual(r.totals, { tracks: 7, tagged: 5, untagged: 2, albums: 2 });
  assert.deepEqual(r.incompleteAlbums.items.map((a) => [a.album, a.missing]), [['Disco', [{ disc: 1, track: 2 }]]]);
  assert.equal(r.duplicateTracks.items[0].numbers[0].track, 3);
  assert.deepEqual(r.mixedAlbums.items.map((a) => [a.album, a.years]), [['Disco', [2000, 2001]]]);
  assert.deepEqual(r.artistVariants.items[0].map((v) => v.name).sort(), ['Faroles, Los', 'Los Faroles']);
  assert.deepEqual(r.untagged.items.map((u) => u.pending), [false, true]);
});

test('analyze limita las listas pero informa del total', () => {
  const rows = Array.from({ length: 10 }, (_, i) => ({ id: i, folder: i, name: 'x', tagged: 1, artist: 'A', band: 'A', album: `D${i}`, track: 2, disc: 1, year: 0 }));
  const r = analyze(rows, (f) => `/${f}`, { maxItems: 3 });
  assert.equal(r.incompleteAlbums.total, 10);
  assert.equal(r.incompleteAlbums.items.length, 3);
});

let h;
before(async () => { h = await makeHarness(); await h.login(); });
after(() => h.close());

test('API: informe sobre la biblioteca real y exige sesión', async () => {
  await h.call('POST', '/api/folders', { parent: '/', name: 'Disco' });
  const folder = h.catalog.tree.resolve('/Disco');
  for (const [name, track] of [['a.mp3', '1'], ['c.mp3', '3']]) h.tg.addFile({ folder, name, bytes: mp3WithTags({ title: name, artist: 'X', album: 'Álbum', track }) });
  await h.call('POST', '/api/refresh'); await h.waitSync(); await h.catalog.tagger.promise;
  const r = await h.call('GET', '/api/audit/library');
  assert.equal(r.res.status, 200);
  assert.equal(r.json.incompleteAlbums.items[0].path, '/Disco');
  assert.deepEqual(r.json.incompleteAlbums.items[0].missing, [{ disc: 1, track: 2 }]);
  assert.equal((await fetch(`${h.base}/api/audit/library`)).status, 401);
});
