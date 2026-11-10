import { toRecord } from './records.js';
import { inChunks, isUniqueViolation } from '../db/database.js';
import { suffixed } from '../utils/paths.js';

const BATCH = 500;
const MASS_MIN = 20;    // por debajo de este tamaño, podar siempre
const MASS_RATIO = 0.5; // fracción del índice que se considera sospechosa

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

  start({ full = false, confirmPrune = false } = {}) {
    this.promise ??= this.#run(full, confirmPrune)
      .catch((err) => { this.state.error = err.message; console.error('[sync] error:', err.message); })
      .finally(() => { this.state.running = false; this.promise = null; });
    return this.promise;
  }

  async #run(forceFull, confirmPrune) {
    // Si cambia TG_CHAT, los ids de mensaje del chat anterior no sirven: sincronización completa y limpieza del índice.
    const chat = String(this.tg.chat ?? 'me');
    const chatChanged = (this.db.meta.get('chat') ?? 'me') !== chat;
    const last = chatChanged ? 0 : Number(this.db.meta.get('last_msg_id') || 0);
    const full = forceFull || chatChanged || !last;
    this.state = { running: true, scanned: 0, full, error: null, pruneBlocked: null };

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

    if (full) this.#prune(seen, chatChanged ? Infinity : maxId, chatChanged || confirmPrune);
    this.db.meta.set('last_msg_id', maxId);
    this.db.meta.set('chat', chat);
    if (chatChanged) console.log(`[sync] el chat de almacenamiento cambió a ${chat}: índice reconstruido`);
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
  #prune(seen, maxId, force = false) {
    const known = this.files.allIds().length + this.tree.byId.size + this.playlists.allMsgIds().length;
    if (!seen.size && known && !force) {
      console.warn('[sync] Telegram no devolvió ningún elemento; se conserva el índice por seguridad');
      return;
    }
    const staleFiles = this.files.allIds().filter((id) => id <= maxId && !seen.has(id));
    const staleFolders = this.tree.allMsgIds().filter((f) => f.id <= maxId && !seen.has(f.id)).map((f) => f.folderId);
    const stalePlaylists = this.playlists.allMsgIds().filter((p) => p.msgId <= maxId && !seen.has(p.msgId));
    // Protección: una búsqueda incompleta de Telegram haría parecer borrado casi todo. Si faltan más de la mitad (con una
    // biblioteca de cierta entidad), no se poda nada hasta que el usuario lo confirme (POST /api/refresh {confirmPrune:true}).
    const stale = staleFiles.length + staleFolders.length + stalePlaylists.length;
    if (!force && known >= MASS_MIN && stale > known * MASS_RATIO) {
      this.state.pruneBlocked = { stale, known };
      console.warn(`[sync] Telegram no devolvió ${stale} de ${known} elementos: no se poda el índice hasta que se confirme`);
      return;
    }
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
