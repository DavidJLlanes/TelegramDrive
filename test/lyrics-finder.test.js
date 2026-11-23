import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeHarness } from './helpers/harness.js';
import { mp3WithTags } from './helpers/id3.js';
import { clean, queryFor, similarity, score } from '../server/features/lyrics/query.js';

process.env.LYRICS_GAP_MS = '0';

const LRC = '[00:01.00]Autopista, noche y gasolina\n[00:04.00]Las luces se derriten en la lluvia';
const record = (o) => ({ id: 1, trackName: 'x', artistName: 'y', albumName: 'z', duration: 0, instrumental: false, plainLyrics: null, syncedLyrics: null, ...o });
const DB = [
  record({ id: 11, trackName: 'Autopista', artistName: 'Los Faroles', albumName: 'Noche', syncedLyrics: LRC, plainLyrics: 'Autopista, noche y gasolina' }),
  record({ id: 12, trackName: 'Autopista', artistName: 'Otro Grupo', plainLyrics: 'Otra letra distinta' }),
  record({ id: 13, trackName: 'Amor', artistName: 'Alguien Lejano', plainLyrics: 'amor amor' }),
  record({ id: 14, trackName: 'Silencio', artistName: 'Los Faroles', instrumental: true }),
  record({ id: 15, trackName: 'Bahía', artistName: 'Los Faroles', plainLyrics: 'Solo texto, sin tiempos' }),
];
const calls = [];
let down = false;
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, opts) => {
  if (!String(url).startsWith('https://lrclib.net/')) return realFetch(url, opts);
  const u = new URL(url); calls.push(`${u.pathname}${u.search}`);
  if (down) return json({}, 429);
  const name = u.searchParams.get('track_name') ?? u.searchParams.get('q') ?? '';
  if (u.pathname === '/api/get') {
    const hit = DB.find((r) => r.trackName === name && r.artistName === u.searchParams.get('artist_name'));
    return hit ? json(hit) : json({ code: 404 }, 404);
  }
  if (u.pathname.startsWith('/api/get/')) { const hit = DB.find((r) => r.id === Number(u.pathname.split('/').pop())); return hit ? json(hit) : json({}, 404); }
  if (u.pathname === '/api/search') return json(DB.filter((r) => r.trackName.toLowerCase().includes(name.toLowerCase().split(' ')[0] || '~')));
  return json({}, 404);
};

let h; let call; const ids = {};
before(async () => {
  h = await makeHarness(); call = h.call; await h.login();
  await call('POST', '/api/folders', { parent: '/', name: 'Música' });
  const folder = h.catalog.tree.resolve('/Música');
  const add = (key, name, tags) => { ids[key] = h.tg.addFile({ folder, name, bytes: mp3WithTags(tags) }).id; };
  add('auto', 'a.mp3', { title: 'Autopista', artist: 'Los Faroles' });
  add('ruido', 'b.mp3', { title: 'Autopista (Remastered 2011)', artist: 'Los Faroles' });
  add('dudosa', 'c.mp3', { title: 'Amor', artist: 'Nadie' });
  add('instr', 'd.mp3', { title: 'Silencio', artist: 'Los Faroles' });
  add('plana', 'e.mp3', { title: 'Bahía', artist: 'Los Faroles' });
  add('caida', 'f.mp3', { title: 'Caída', artist: 'Los Faroles' });
  ids.img = h.tg.addFile({ folder, name: 'f.png', bytes: Buffer.from('x') }).id;
  await call('POST', '/api/refresh'); await h.waitSync();
});
after(() => { globalThis.fetch = realFetch; h.close(); });

test('limpia lo que sobra del título y saca artista y título del nombre del archivo si no hay etiquetas', () => {
  assert.equal(clean('Autopista (Remastered 2011)'), 'Autopista');
  assert.equal(clean('Autopista - 2011 Remaster'), 'Autopista');
  assert.equal(clean('Tema [Official Video] (feat. Alguien)'), 'Tema');
  assert.equal(clean('Mi (Gran) Tema'), 'Mi (Gran) Tema');
  assert.deepEqual(queryFor({ name: '07 - Los Faroles - Autopista_Live.mp3' }), { title: 'Autopista Live', artist: 'Los Faroles', album: '', duration: 0 });
  assert.deepEqual(queryFor({ name: 'x.mp3', tags: { title: 'T', band: 'B', album: 'A', duration: 183.4 } }), { title: 'T', artist: 'B', album: 'A', duration: 183 });
});

test('puntuación: título y artista parecidos, duración compatible; solo es «segura» si todo encaja', () => {
  assert.equal(similarity('Canción', 'cancion'), 1);
  const q = { title: 'Autopista', artist: 'Los Faroles', duration: 200 };
  assert.equal(score(q, { title: 'Autopista', artist: 'Los Faroles', duration: 201 }).confident, true);
  assert.equal(score(q, { title: 'Autopista', artist: 'Otro Grupo', duration: 200 }).confident, false);
  assert.equal(score(q, { title: 'Autopista', artist: 'Los Faroles', duration: 260 }).confident, false);
  assert.equal(score({ title: 'Autopista', artist: '', duration: 0 }, { title: 'Autopista', artist: 'Cualquiera', duration: 99 }).confident, true);
});

test('buscar: devuelve candidatos ordenados con vista previa y solo envía título, artista, álbum y duración', async () => {
  calls.length = 0;
  const r = await call('GET', `/api/lyrics/${ids.auto}/search`);
  assert.equal(r.res.status, 200, r.text);
  assert.equal(r.json.candidates[0].id, 11);
  assert.equal(r.json.candidates[0].synced, true);
  assert.equal(r.json.candidates[0].confident, true);
  assert.equal(r.json.candidates[0].preview, 'Autopista, noche y gasolina / Las luces se derriten en la lluvia');
  assert.equal(r.json.candidates.some((c) => c.id === 12 && !c.confident), true);
  assert.ok(!('text' in r.json.candidates[0]), 'la letra completa no viaja en el listado');
  for (const c of calls) assert.match(c, /^\/api\/(get|search)/);
  for (const c of calls) assert.doesNotMatch(c, /msg|folder|Música|\.mp3/);
});

test('buscar con texto libre afina la búsqueda; el título con ruido se limpia antes de preguntar', async () => {
  calls.length = 0;
  const r = await call('GET', `/api/lyrics/${ids.ruido}/search`);
  assert.equal(r.json.candidates[0].id, 11);
  assert.ok(calls.some((c) => c.includes('track_name=Autopista&')), calls.join(' '));
  assert.ok(!calls.some((c) => /Remastered/.test(c)));
  const manual = await call('GET', `/api/lyrics/${ids.dudosa}/search?q=Bah%C3%ADa`);
  assert.ok(calls.some((c) => c.startsWith('/api/search?q=Bah')));
  assert.equal(manual.json.candidates[0].id, 15);
});

test('elegir una: el servidor pide el texto a LRCLIB (el cliente solo manda el id) y lo guarda como «lrclib»', async () => {
  const r = await call('POST', `/api/lyrics/${ids.auto}/adopt`, { lrclibId: 11, text: 'texto falso del cliente' });
  assert.equal(r.res.status, 200, r.text);
  assert.equal(r.json.lyrics.text, LRC);
  assert.equal(r.json.lyrics.source, 'lrclib');
  assert.equal((await call('POST', `/api/lyrics/${ids.auto}/adopt`, { lrclibId: 'x' })).res.status, 400);
  assert.equal((await call('POST', `/api/lyrics/${ids.auto}/adopt`, { lrclibId: 999 })).res.status, 404);
  assert.equal((await call('POST', `/api/lyrics/${ids.auto}/adopt`, { lrclibId: 14 })).res.status, 400); // instrumental
  assert.equal((await call('POST', `/api/lyrics/${ids.img}/adopt`, { lrclibId: 11 })).res.status, 400);
});

test('automático: guarda la coincidencia segura; sin coincidencia segura no guarda nada y no repite la búsqueda', async () => {
  const found = await call('POST', `/api/lyrics/${ids.ruido}/auto`);
  assert.equal(found.json.state, 'found');
  assert.equal(found.json.lyrics.text, LRC);

  const none = await call('POST', `/api/lyrics/${ids.dudosa}/auto`);
  assert.equal(none.json.state, 'none');
  assert.equal((await call('GET', `/api/lyrics/${ids.dudosa}`)).json.lyrics, null);
  calls.length = 0;
  assert.equal((await call('POST', `/api/lyrics/${ids.dudosa}/auto`)).json.state, 'skipped');
  assert.equal(calls.length, 0, 'no vuelve a preguntar a LRCLIB');

  assert.equal((await call('POST', `/api/lyrics/${ids.instr}/auto`)).json.state, 'none'); // instrumental: nada que guardar
  assert.equal((await call('POST', `/api/lyrics/${ids.auto}/auto`)).json.state, 'skipped'); // ya tiene letra
});

test('si se quita una letra, el automático no la vuelve a poner', async () => {
  assert.equal((await call('DELETE', `/api/lyrics/${ids.ruido}`)).json.removed, true);
  assert.equal((await call('POST', `/api/lyrics/${ids.ruido}/auto`)).json.state, 'skipped');
  assert.equal((await call('GET', `/api/lyrics/${ids.ruido}`)).json.lyrics, null);
  // pero a mano sí se puede
  assert.equal((await call('POST', `/api/lyrics/${ids.ruido}/adopt`, { lrclibId: 11 })).res.status, 200);
});

test('si LRCLIB pide esperar o falla, el error es comprensible y no se marca la canción como buscada', async () => {
  down = true;
  const r = await call('POST', `/api/lyrics/${ids.caida}/auto`);
  assert.equal(r.res.status, 503);
  assert.match(r.json.error, /LRCLIB/);
  down = false;
  assert.equal((await call('POST', `/api/lyrics/${ids.caida}/auto`)).json.state, 'none'); // ahora sí busca (no había quedado marcada)
});

test('toda la biblioteca: recorre las canciones sin letra, informa del progreso y respeta las ya buscadas', async () => {
  const before = await call('GET', '/api/lyrics/finder');
  assert.equal(before.json.running, false);
  const start = await call('POST', '/api/lyrics/finder/start');
  assert.equal(start.res.status, 200);
  let status = start.json;
  for (let i = 0; i < 100 && status.running; i += 1) { await new Promise((r) => setTimeout(r, 20)); status = (await call('GET', '/api/lyrics/finder')).json; }
  assert.equal(status.running, false);
  // pendientes: «plana» (dudosa/instrumental/caída ya se buscaron; auto y ruido tienen letra)
  assert.equal(status.total, 1);
  assert.equal(status.found, 1);
  assert.equal((await call('GET', `/api/lyrics/${ids.plana}`)).json.lyrics.text, 'Solo texto, sin tiempos');
  assert.equal((await call('POST', '/api/lyrics/finder/start')).json.total, 0);
});

test('la búsqueda masiva se para si LRCLIB deja de responder', async () => {
  const folder = h.catalog.tree.resolve('/Música');
  for (const n of [1, 2, 3]) h.tg.addFile({ folder, name: `n${n}.mp3`, bytes: mp3WithTags({ title: `Nueva ${n}`, artist: 'Los Faroles' }) });
  await call('POST', '/api/refresh'); await h.waitSync();
  down = true;
  let status = (await call('POST', '/api/lyrics/finder/start')).json;
  for (let i = 0; i < 100 && status.running; i += 1) { await new Promise((r) => setTimeout(r, 20)); status = (await call('GET', '/api/lyrics/finder')).json; }
  down = false;
  assert.equal(status.running, false);
  assert.match(status.error, /LRCLIB/);
  assert.ok(status.done < status.total);
});

test('hay que iniciar sesión', async () => {
  const anon = await fetch(`${h.base}/api/lyrics/${ids.auto}/search`);
  assert.equal(anon.status, 401);
  assert.equal((await fetch(`${h.base}/api/lyrics/finder/start`, { method: 'POST' })).status, 401);
});

test('se puede cancelar la búsqueda masiva', async () => {
  const folder = h.catalog.tree.resolve('/Música');
  for (const n of [1, 2, 3, 4]) h.tg.addFile({ folder, name: `c${n}.mp3`, bytes: mp3WithTags({ title: `Cancelable ${n}`, artist: 'Los Faroles' }) });
  await call('POST', '/api/refresh'); await h.waitSync();
  const start = (await call('POST', '/api/lyrics/finder/start')).json;
  assert.equal(start.running, true);
  await call('POST', '/api/lyrics/finder/cancel');
  let status = start;
  for (let i = 0; i < 100 && status.running; i += 1) { await new Promise((r) => setTimeout(r, 20)); status = (await call('GET', '/api/lyrics/finder')).json; }
  assert.equal(status.running, false);
  assert.ok(status.done < status.total, `se detuvo antes de terminar (${status.done}/${status.total})`);
});
