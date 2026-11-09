import { inChunks } from './database.js';
import { searchKey } from '../utils/text.js';
import { effectiveTags, hasAny } from '../utils/tag-merge.js';

export const COLS = 'msg_id AS id, folder, name, size, mime, kind, date, thumb, tagged, title, artist, album, band, genre, track, disc, year, duration, trashed';
const marks = (n) => Array(n).fill('?').join(',');
const parse = (json) => { try { return json ? JSON.parse(json) : {}; } catch { return {}; } };

export class FilesRepo {
  constructor(db) { this.db = db; }

  upsert(r) {
    const ovr = r.ovr && Object.keys(r.ovr).length ? JSON.stringify(r.ovr) : '';
    const had = r.kind === 'audio' && this.db.stmt('SELECT ovr FROM files WHERE msg_id = ?').get(r.msgId)?.ovr;
    this.db.stmt(`INSERT INTO files (msg_id, folder, name, key, size, mime, kind, date, thumb, trashed, ovr)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(msg_id) DO UPDATE SET folder = excluded.folder, name = excluded.name, key = excluded.key,
        size = excluded.size, mime = excluded.mime, kind = excluded.kind, date = excluded.date,
        thumb = MAX(excluded.thumb, files.thumb), trashed = excluded.trashed, ovr = excluded.ovr`) // la portada extraída de las etiquetas se conserva
      .run(r.msgId, r.folder, r.name, searchKey(r.name), r.size, r.mime, r.kind, r.date, r.thumb ? 1 : 0, r.trashed ?? 0, ovr);
    if (ovr || had) this.reapply(r.msgId); // también si se quitó una corrección desde otro dispositivo
  }

  get(id) { return this.db.stmt(`SELECT ${COLS}, hidden FROM files WHERE msg_id = ?`).get(id); }

  byIds(ids) {
    const out = [];
    inChunks(ids, (c) => out.push(...this.db.stmt(`SELECT ${COLS} FROM files WHERE hidden = 0 AND msg_id IN (${marks(c.length)})`).all(...c)));
    return out;
  }

  inFolder(folder, kind) {
    return kind
      ? this.db.stmt(`SELECT ${COLS} FROM files WHERE folder = ? AND kind = ? AND hidden = 0`).all(folder, kind)
      : this.db.stmt(`SELECT ${COLS} FROM files WHERE folder = ? AND hidden = 0`).all(folder);
  }

  exists(folder, name, exceptId = 0) {
    return Boolean(this.db.stmt('SELECT 1 AS x FROM files WHERE folder = ? AND name = ? AND trashed = 0 AND msg_id != ?').get(folder, name, exceptId));
  }

  /** Busca por nombre de archivo y por etiquetas (título, artista, álbum). */
  search(query, limit) {
    const like = `%${searchKey(query).replace(/[\\%_]/g, '\\$&')}%`;
    return this.db.stmt(`SELECT ${COLS} FROM files WHERE hidden = 0 AND (key LIKE ? ESCAPE '\\' OR tkey LIKE ? ESCAPE '\\') LIMIT ?`).all(like, like, limit);
  }

  rename(id, name) {
    this.db.stmt('UPDATE files SET name = ?, key = ? WHERE msg_id = ?').run(name, searchKey(name), id);
  }

  move(id, folder, name) {
    this.db.stmt('UPDATE files SET folder = ?, name = ?, key = ? WHERE msg_id = ?').run(folder, name, searchKey(name), id);
  }

  remove(ids) {
    inChunks(ids, (c) => this.db.stmt(`DELETE FROM files WHERE msg_id IN (${marks(c.length)})`).run(...c));
  }

  idsInFolders(folderIds) {
    const out = [];
    inChunks(folderIds, (c) => {
      out.push(...this.db.stmt(`SELECT msg_id AS id FROM files WHERE folder IN (${marks(c.length)})`).all(...c).map((r) => r.id));
    });
    return out;
  }

  allIds() { return this.db.stmt('SELECT msg_id AS id FROM files').all().map((r) => r.id); }

  // --- papelera ---
  setTrashed(id, ts) { this.db.stmt('UPDATE files SET trashed = ?, hidden = ? WHERE msg_id = ?').run(ts, ts ? 1 : 0, id); }
  trashedFiles() { return this.db.stmt(`SELECT ${COLS} FROM files WHERE trashed > 0 ORDER BY trashed DESC`).all(); }

  /** Oculta los archivos de la papelera y los que están dentro de carpetas en la papelera. */
  refreshHidden(hiddenFolders) {
    this.db.stmt('UPDATE files SET hidden = 1 WHERE trashed > 0 AND hidden = 0').run();
    this.db.stmt('UPDATE files SET hidden = 0 WHERE trashed = 0 AND hidden = 1').run();
    inChunks([...hiddenFolders], (c) => this.db.stmt(`UPDATE files SET hidden = 1 WHERE folder IN (${marks(c.length)})`).run(...c));
  }

  // --- etiquetas de música ---
  untagged(limit) {
    return this.db.stmt("SELECT msg_id AS id, name FROM files WHERE kind = 'audio' AND tagged = 0 ORDER BY msg_id DESC LIMIT ?").all(limit);
  }

  countUntagged() {
    return this.db.stmt("SELECT COUNT(*) AS n FROM files WHERE kind = 'audio' AND tagged = 0").get().n;
  }

  /** Guarda lo leído del archivo (`raw`, o null si no hay etiquetas) y recalcula las etiquetas efectivas. */
  setTags(id, raw, { cover = false, duration = 0 } = {}) {
    this.db.stmt('UPDATE files SET tagged = ?, raw = ?, duration = ?, thumb = MAX(thumb, ?) WHERE msg_id = ?')
      .run(raw ? 1 : 2, raw ? JSON.stringify(raw) : '', Math.round(duration) || 0, cover ? 1 : 0, id);
    this.reapply(id);
  }

  setOverride(id, ovr) {
    this.db.stmt('UPDATE files SET ovr = ? WHERE msg_id = ?').run(Object.keys(ovr).length ? JSON.stringify(ovr) : '', id);
    this.reapply(id);
  }

  overrideOf(id) { return parse(this.db.stmt('SELECT ovr FROM files WHERE msg_id = ?').get(id)?.ovr); }

  reapply(id) {
    const row = this.db.stmt('SELECT raw, ovr, tagged FROM files WHERE msg_id = ?').get(id);
    if (!row || row.tagged === 0) return;
    const t = effectiveTags(parse(row.raw), parse(row.ovr));
    this.db.stmt(`UPDATE files SET tagged = ?, title = ?, artist = ?, album = ?, band = ?, genre = ?, track = ?, disc = ?, year = ?, tkey = ? WHERE msg_id = ?`)
      .run(hasAny(t) ? 1 : 2, t.title, t.artist, t.album, t.band, t.genre, t.track, t.disc, t.year, searchKey(`${t.title} ${t.artist} ${t.album}`), id);
  }

  audioIn(folderIds) {
    const out = [];
    inChunks(folderIds, (c) => out.push(...this.db.stmt(`SELECT ${COLS} FROM files WHERE kind = 'audio' AND hidden = 0 AND folder IN (${marks(c.length)})`).all(...c)));
    return out;
  }

  stats() {
    const row = this.db.stmt('SELECT COUNT(*) AS files, COALESCE(SUM(size), 0) AS bytes FROM files WHERE hidden = 0').get();
    return { files: row.files, bytes: row.bytes };
  }
}
