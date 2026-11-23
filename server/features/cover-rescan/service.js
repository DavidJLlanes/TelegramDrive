import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../../config/index.js';
import { shrinkCover } from '../../services/cover.js';
import { findAlbumCover } from './cover-finder.js';

const MAX_ALBUMS = 150;      // por ejecución, para no saturar la API externa
const PAUSE_MS = 3000;       // ~20 consultas por minuto

/** Relee etiquetas y carátulas de las canciones y busca fuera las que sigan sin carátula. */
export function createService({ files, tree, tagger, find = findAlbumCover, pause = PAUSE_MS }) {
  let job = { running: false, phase: '', done: 0, total: 0, found: 0, error: null };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function search(signal) {
    const albums = new Map();
    for (const row of files.withoutCover()) {
      const key = `${row.band}\0${row.album}`;
      if (!albums.has(key)) albums.set(key, { artist: row.band, album: row.album, ids: [] });
      albums.get(key).ids.push(row.id);
    }
    const todo = [...albums.values()].slice(0, MAX_ALBUMS);
    job = { ...job, phase: 'search', done: 0, total: todo.length };
    for (const item of todo) {
      if (signal.stopped) return;
      try {
        const raw = await find(item.artist, item.album);
        const small = raw && await shrinkCover(raw);
        if (small) {
          for (const id of item.ids) {
            await fs.writeFile(path.join(config.thumbsDir, `${id}.jpg`), small);
            files.markCover(id);
          }
          job.found += item.ids.length;
        }
      } catch (err) { console.warn(`[carátulas] ${item.artist} – ${item.album}: ${err.message}`); }
      job.done += 1;
      await sleep(pause);
    }
  }

  const signal = { stopped: false };
  return {
    state: () => ({ ...job }),
    stop() { signal.stopped = true; },
    /** Devuelve false si ya hay una ejecución en marcha. */
    start({ folder = '/', lookup = true } = {}) {
      if (job.running) return false;
      const id = tree.resolve(folder);
      if (id === null) throw Object.assign(new Error('La carpeta no existe'), { status: 404 });
      const ids = files.audioIn(tree.subtree(id)).map((row) => row.id);
      job = { running: true, phase: 'tags', done: 0, total: ids.length, found: 0, error: null };
      files.resetTags(ids);
      (async () => {
        await tagger.kick();
        if (lookup) await search(signal);
      })().catch((err) => { job.error = err.message; })
        .finally(() => { job = { ...job, running: false, phase: '' }; });
      return true;
    },
  };
}
