import { encodeFile } from '../telegram/codec.js';
import { cleanOverrides } from '../utils/tag-merge.js';
import { notFound } from '../utils/errors.js';

const PAUSE_MS = 120; // respeta los límites de Telegram al editar muchos mensajes seguidos

/** Corrección de etiquetas desde la app: se guardan en el pie del mensaje (1 edición por archivo); el archivo no se toca. */
export class Retag {
  constructor({ tg, files, library, lock }) {
    Object.assign(this, { tg, files, library, lock });
    this.job = { running: false, done: 0, total: 0, error: null };
    this.pause = PAUSE_MS;
  }

  state() { return { ...this.job }; }

  /** Aplica `patch` (valor vacío = quitar la corrección) y edita el mensaje si algo cambió. */
  async #apply(row, patch) {
    const current = this.files.overrideOf(row.id);
    const next = { ...current, ...patch };
    for (const [k, v] of Object.entries(next)) if (v === '' || v === null) delete next[k];
    const ovr = cleanOverrides(next);
    if (JSON.stringify(ovr) === JSON.stringify(current)) return false;
    await this.tg.editText(row.id, encodeFile({ folder: row.folder, name: row.name, trashed: row.trashed, ovr }));
    this.files.setOverride(row.id, ovr);
    return true;
  }

  track(id, patch) {
    return this.lock.run(async () => {
      const row = this.files.get(Number(id));
      if (!row || row.hidden || row.kind !== 'audio') throw notFound('Canción no encontrada');
      await this.#apply(row, patch);
      return this.files.get(row.id);
    });
  }

  /** Cambia las etiquetas de todas las canciones de `filter` ({artist, album, genre}) en segundo plano. */
  start(filter, set) {
    return this.startRows(this.library.repo.tracks({ band: filter.artist, album: filter.album, genre: filter.genre }), set, filter);
  }

  /** Aplica `set` a una lista concreta de canciones (selección o carpeta). */
  startRows(rows, set, filter = {}) {
    if (this.job.running) return false;
    this.job = { running: true, done: 0, total: rows.length, error: null };
    const renamesBand = set.band !== undefined && filter.artist !== undefined;
    (async () => {
      for (const row of rows) {
        const patch = { ...set };
        // al renombrar un artista, las pistas cuyo artista es el mismo nombre lo siguen (no las de colaboraciones)
        if (renamesBand && set.artist === undefined && String(row.artist).toLowerCase() === String(filter.artist).toLowerCase()) patch.artist = set.band;
        await this.lock.run(() => this.#apply(row, patch)).catch((err) => { this.job.error = err.message; });
        this.job.done += 1;
        await new Promise((r) => setTimeout(r, this.pause));
      }
    })().finally(() => { this.job.running = false; });
    return true;
  }
}
