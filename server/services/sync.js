import { toRecord } from './records.js';
import { inChunks, isUniqueViolation } from '../db/database.js';
import { suffixed } from '../utils/paths.js';

const BATCH = 500;

/**
 * Sincroniza el índice SQLite con Telegram.
 *  - incremental: solo mensajes nuevos desde el último id conocido (arranque normal).
 *  - completa: relee todo y poda lo que ya no existe (botón "Sincronizar").
 */
export class Syncer {
  constructor({ tg, db, tree, files, playlists }) {
    Object.assign(this, { tg, db, tree, files, playlists });
    this.state = { running: false, scanned: 0, full: false, error: null };
    this.promise = null;
  }

  start({ full = false } = {}) {
    this.promise ??= this.#run(full)
      .catch((err) => { this.state.error = err.message; console.error('[sync] error:', err.message); })
      .finally(() => { this.state.running = false; this.promise = null; });
    return this.promise;
  }

  async #run(forceFull) {
    const last = Number(this.db.meta.get('last_msg_id') || 0);
    const full = forceFull || !last;
    this.state = { running: true, scanned: 0, full, error: null };

    const seen = new Set();
    let maxId = last;
    let batch = [];
    const flush = () => {
      if (!batch.length) return;
      const records = batch;
      batch = [];
      this.db.tx(() => records.forEach((r) => this.#apply(r)));
      this.tree.reload();
      this.files.refreshHidden(this.tree.hiddenIds);
    };

    for await (const message of this.tg.iterTagged({ minId: full ? 0 : last })) {
      this.state.scanned += 1;
      maxId = Math.max(maxId, message.id);
      const record = toRecord(message);
      if (!record) continue;
      seen.add(record.msgId);
      batch.push(record);
      if (batch.length >= BATCH) flush();
    }
    flush();

    if (full) this.#prune(seen, maxId);
    this.db.meta.set('last_msg_id', maxId);
    console.log(`[sync] ${full ? 'completa' : 'incremental'}: ${this.state.scanned} mensajes revisados`);
  }

  #apply(r) {
    if (r.type === 'folder') { this.tree.upsertFromSync(r); return; }
    if (r.type === 'playlist') { this.playlists.upsert(r); return; }
    try {
      this.files.upsert(r);
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      this.files.upsert({ ...r, name: suffixed(r.name, r.msgId) }); // duplicado de nombre en la misma carpeta
    }
  }

  /** Borra del índice lo que ya no está en Telegram. Solo ids <= maxId: no toca subidas hechas durante el escaneo. */
  #prune(seen, maxId) {
    const known = this.files.allIds().length + this.tree.byId.size + this.playlists.allMsgIds().length;
    if (!seen.size && known) {
      console.warn('[sync] Telegram no devolvió ningún elemento; se conserva el índice por seguridad');
      return;
    }
    const staleFiles = this.files.allIds().filter((id) => id <= maxId && !seen.has(id));
    const staleFolders = this.tree.allMsgIds().filter((f) => f.id <= maxId && !seen.has(f.id)).map((f) => f.folderId);
    const stalePlaylists = this.playlists.allMsgIds().filter((p) => p.msgId <= maxId && !seen.has(p.msgId));
    this.db.tx(() => {
      stalePlaylists.forEach((p) => this.playlists.remove(p.id));
      this.files.remove(staleFiles);
      inChunks(staleFolders, (c) => c.forEach((id) => this.db.stmt('DELETE FROM folders WHERE id = ?').run(id)));
    });
    this.tree.reload();
    this.files.refreshHidden(this.tree.hiddenIds);
    if (staleFiles.length || staleFolders.length) {
      console.log(`[sync] podados ${staleFiles.length} archivos y ${staleFolders.length} carpetas`);
    }
  }
}
