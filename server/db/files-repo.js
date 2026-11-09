import { inChunks } from './database.js';
import { searchKey } from '../utils/text.js';

const COLS = 'msg_id AS id, folder, name, size, mime, kind, date, thumb';
const marks = (n) => Array(n).fill('?').join(',');

export class FilesRepo {
  constructor(db) { this.db = db; }

  upsert(r) {
    this.db.stmt(`INSERT INTO files (msg_id, folder, name, key, size, mime, kind, date, thumb)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(msg_id) DO UPDATE SET folder = excluded.folder, name = excluded.name, key = excluded.key,
        size = excluded.size, mime = excluded.mime, kind = excluded.kind, date = excluded.date, thumb = excluded.thumb`)
      .run(r.msgId, r.folder, r.name, searchKey(r.name), r.size, r.mime, r.kind, r.date, r.thumb ? 1 : 0);
  }

  get(id) { return this.db.stmt(`SELECT ${COLS} FROM files WHERE msg_id = ?`).get(id); }

  inFolder(folder, kind) {
    return kind
      ? this.db.stmt(`SELECT ${COLS} FROM files WHERE folder = ? AND kind = ?`).all(folder, kind)
      : this.db.stmt(`SELECT ${COLS} FROM files WHERE folder = ?`).all(folder);
  }

  exists(folder, name, exceptId = 0) {
    return Boolean(this.db.stmt('SELECT 1 AS x FROM files WHERE folder = ? AND name = ? AND msg_id != ?').get(folder, name, exceptId));
  }

  search(query, limit) {
    const like = `%${searchKey(query).replace(/[\\%_]/g, '\\$&')}%`;
    return this.db.stmt(`SELECT ${COLS} FROM files WHERE key LIKE ? ESCAPE '\\' LIMIT ?`).all(like, limit);
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

  stats() {
    const row = this.db.stmt('SELECT COUNT(*) AS files, COALESCE(SUM(size), 0) AS bytes FROM files').get();
    return { files: row.files, bytes: row.bytes };
  }
}
