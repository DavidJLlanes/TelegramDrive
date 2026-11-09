import { isUniqueViolation } from './database.js';
import { compareNames } from '../utils/text.js';

export const ROOT = 'root';

/** Árbol de carpetas en memoria (pocas filas) respaldado por SQLite. Las rutas se derivan de los ids. */
export class FolderTree {
  constructor(db) {
    this.db = db;
    this.reload();
  }

  /** `byId` contiene todas las carpetas (también las de la papelera); `kids` y las búsquedas solo las visibles. */
  reload() {
    const rows = this.db.stmt('SELECT id, msg_id AS msgId, parent, name, trashed FROM folders').all();
    this.byId = new Map(rows.map((r) => [r.id, r]));
    const all = new Map();
    for (const f of this.byId.values()) {
      if (!all.has(f.parent)) all.set(f.parent, []);
      all.get(f.parent).push(f);
    }
    this.allKids = all;
    this.hiddenIds = new Set();
    const hide = (f) => { this.hiddenIds.add(f.id); (all.get(f.id) ?? []).forEach(hide); };
    rows.filter((f) => f.trashed).forEach((f) => !this.hiddenIds.has(f.id) && hide(f));
    this.kids = new Map();
    for (const f of this.byId.values()) {
      if (this.hiddenIds.has(f.id)) continue;
      if (!this.kids.has(f.parent)) this.kids.set(f.parent, new Map());
      this.kids.get(f.parent).set(f.name.toLowerCase(), f);
    }
  }

  exists = (id) => id === ROOT || (this.byId.has(id) && !this.hiddenIds.has(id));
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
    return [...this.byId.keys()].filter((id) => !this.hiddenIds.has(id)).map((id) => this.pathOf(id)).sort(compareNames);
  }

  /** Carpeta y todo lo que cuelga de ella, incluidas las subcarpetas en la papelera. */
  subtree(id) {
    const out = [id];
    for (let i = 0; i < out.length; i += 1) (this.allKids.get(out[i]) ?? []).forEach((c) => out.push(c.id));
    return out;
  }

  /** Carpetas enviadas a la papelera directamente (no las que solo cuelgan de otra eliminada). */
  trashedRoots() {
    return [...this.byId.values()].filter((f) => f.trashed && !this.hiddenIds.has(f.parent));
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

  update(id, { parent, name, trashed = 0 }) {
    this.db.stmt('UPDATE folders SET parent = ?, name = ?, trashed = ? WHERE id = ?').run(parent, name, trashed, id);
    this.reload();
  }

  remove(ids) {
    ids.forEach((id) => this.db.stmt('DELETE FROM folders WHERE id = ?').run(id));
    this.reload();
  }

  /** Alta desde la sincronización: tolera duplicados de nombre sufijando con el id del mensaje. */
  upsertFromSync({ id, msgId, parent, name, trashed = 0 }) {
    const sql = `INSERT INTO folders (id, msg_id, parent, name, trashed) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET msg_id = excluded.msg_id, parent = excluded.parent, name = excluded.name, trashed = excluded.trashed`;
    try {
      this.db.stmt(sql).run(id, msgId, parent, name, trashed);
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      this.db.stmt(sql).run(id, msgId, parent, `${name} (${msgId})`, trashed);
    }
  }

  allMsgIds() { return this.db.stmt('SELECT msg_id AS id, id AS folderId FROM folders').all(); }
}
