import { randomBytes } from 'node:crypto';
import { badRequest, notFound } from '../utils/errors.js';

const HOUR = 3_600_000;
export const DURATIONS = { '1h': HOUR, '1d': 24 * HOUR, '7d': 7 * 24 * HOUR, '30d': 30 * 24 * HOUR };

/** Enlaces compartidos con caducidad. Solo viven en SQLite: no dan acceso a nada más que al archivo o carpeta compartidos. */
export class Shares {
  constructor({ db, files, tree }) { Object.assign(this, { db, files, tree }); }

  create({ kind, target, duration = '7d' }) {
    const ttl = DURATIONS[duration];
    if (!ttl) throw badRequest('Duración no válida');
    let label;
    if (kind === 'file') {
      const row = this.files.get(Number(target));
      if (!row || row.hidden) throw notFound('Archivo no encontrado');
      label = row.name;
    } else if (kind === 'folder') {
      const id = this.tree.resolve(String(target));
      if (id === null) throw notFound('La carpeta no existe');
      label = `${this.tree.pathOf(id).split('/').pop() || 'Inicio'} (ZIP)`;
    } else throw badRequest('Tipo no válido');
    const token = randomBytes(24).toString('base64url');
    const now = Date.now();
    this.db.stmt('INSERT INTO shares (token, kind, target, label, exp, created) VALUES (?, ?, ?, ?, ?, ?)').run(token, kind, String(target), label, now + ttl, now);
    return { token, kind, label, exp: now + ttl };
  }

  #purge() { this.db.stmt('DELETE FROM shares WHERE exp < ?').run(Date.now()); }

  list() {
    this.#purge();
    return this.db.stmt('SELECT token, kind, label, exp, created FROM shares ORDER BY created DESC').all();
  }

  revoke(token) { this.db.stmt('DELETE FROM shares WHERE token = ?').run(token); }

  /** Devuelve el enlace si existe y no ha caducado. */
  resolve(token) {
    const row = this.db.stmt('SELECT * FROM shares WHERE token = ?').get(String(token));
    if (!row) return null;
    if (row.exp < Date.now()) { this.revoke(row.token); return null; }
    return row;
  }
}
