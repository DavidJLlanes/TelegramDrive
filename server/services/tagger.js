import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config/index.js';
import { readTags } from './tags.js';

const BATCH = 60;
const CONCURRENCY = 3;
const MAX_FAILURES = 5;

/** Lee en segundo plano las etiquetas de los audios nuevos y las guarda en el índice. */
export class Tagger {
  constructor({ tg, files }) {
    Object.assign(this, { tg, files });
    this.running = false;
    this.promise = Promise.resolve();
  }

  state() { return { running: this.running, pending: this.files.countUntagged() }; }

  kick() {
    if (!this.running) {
      this.running = true;
      this.promise = this.#loop().finally(() => { this.running = false; });
    }
    return this.promise;
  }

  async #loop() {
    let failures = 0;
    for (;;) {
      const rows = this.files.untagged(BATCH);
      if (!rows.length) return;
      let progressed = false;
      const queue = [...rows];
      const worker = async () => {
        for (let row = queue.shift(); row; row = queue.shift()) {
          if (failures >= MAX_FAILURES) return;
          if (await this.#one(row)) { progressed = true; failures = 0; } else failures += 1;
        }
      };
      await Promise.all(Array.from({ length: CONCURRENCY }, worker));
      if (failures >= MAX_FAILURES || !progressed) {
        console.warn('[tags] se pausa la lectura de etiquetas; se reintentará en la próxima sincronización o subida');
        return;
      }
    }
  }

  /** true si el archivo quedó resuelto (con o sin etiquetas); false ante un fallo transitorio de red. */
  async #one(row) {
    try {
      const message = await this.tg.getMessage(row.id);
      const { tags, cover } = await readTags(this.tg, message, row.name);
      if (cover) await fs.writeFile(path.join(config.thumbsDir, `${row.id}.jpg`), cover).catch(() => {});
      this.files.setTags(row.id, tags, Boolean(cover));
      return true;
    } catch (err) {
      if (err?.status === 404) { this.files.setTags(row.id, null, false); return true; } // borrado en Telegram
      console.warn(`[tags] ${row.name}: ${err.message}`);
      return false;
    }
  }
}
