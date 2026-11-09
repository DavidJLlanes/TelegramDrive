import { isUniqueViolation } from './database.js';
import { compareNames } from '../utils/text.js';

export const ROOT = 'root';

/** Árbol de carpetas en memoria (pocas filas) respaldado por SQLite. Las rutas se derivan de los ids. */
export class FolderTree {
  constructor(db) {
    this.db = db;
    this.reload();
  }

  reload() {
    const rows = this.db.stmt('SELECT id, msg_id AS msgId, parent, name FROM folders').all();
    this.byId = new Map(rows.map((r) => [r.id, r]));
    this.kids = new Map();
    for (const f of this.byId.values()) {
      if (!this.kids.has(f.parent)) this.kids.set(f.parent, new Map());
      this.kids.get(f.parent).set(f.name.toLowerCase(), f);
    }
  }

  exists = (id) => id === ROOT || this.byId.has(id);
  child = (parent, name) => this.kids.get(parent)?.get(name.toLowerCase()) ?? null;
  get(id) { return this.byId.get(id) ?? null; }

  childrenOf(id) {
    return [...(this.kids.get(id)?.values() ?? [])].sort((a, b) => compareNames(a.name, b.name));
  }

  /** "/A/B" -> id de la carpeta, o null si no existe. */
  resolve(path) {
    let id = ROOT;
    for (const segment of path.split('/').filter(Boolean)) {
      const next = this.child(id, segment);
      if (!next) return null;
      id = next.id;
    }
    return id;
  }

  pathOf(id) {
    const parts = [];
    for (let cur = this.byId.get(id), guard = 0; cur && guard < 100; cur = this.byId.get(cur.parent), guard += 1) {
      parts.push(cur.name);
    }
    return `/${parts.reverse().join('/')}`;
  }

  allPaths() {
    return [...this.byId.keys()].map((id) => this.pathOf(id)).sort(compareNames);
  }

  descendants(id) {
    const out = [id];
    for (let i = 0; i < out.length; i += 1) this.childrenOf(out[i]).forEach((c) => out.push(c.id));
    return out;
  }

  /** ¿`id` es `ancestor` o cuelga de él? */
  isWithin(id, ancestor) {
    for (let cur = id, guard = 0; cur && cur !== ROOT && guard < 100; cur = this.byId.get(cur)?.parent, guard += 1) {
      if (cur === ancestor) return true;
    }
    return false;
  }

  insert({ id, msgId, parent, name }) {
    this.db.stmt('INSERT INTO folders (id, msg_id, parent, name) VALUES (?, ?, ?, ?)').run(id, msgId, parent, name);
    this.reload();
  }

  update(id, { parent, name }) {
    this.db.stmt('UPDATE folders SET parent = ?, name = ? WHERE id = ?').run(parent, name, id);
    this.reload();
  }

  remove(ids) {
    ids.forEach((id) => this.db.stmt('DELETE FROM folders WHERE id = ?').run(id));
    this.reload();
  }

  /** Alta desde la sincronización: tolera duplicados de nombre sufijando con el id del mensaje. */
  upsertFromSync({ id, msgId, parent, name }) {
    const sql = `INSERT INTO folders (id, msg_id, parent, name) VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET msg_id = excluded.msg_id, parent = excluded.parent, name = excluded.name`;
    try {
      this.db.stmt(sql).run(id, msgId, parent, name);
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      this.db.stmt(sql).run(id, msgId, parent, `${name} (${msgId})`);
    }
  }

  allMsgIds() { return this.db.stmt('SELECT msg_id AS id, id AS folderId FROM folders').all(); }
}
