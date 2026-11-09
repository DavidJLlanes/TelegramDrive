import fs from 'node:fs';
import path from 'node:path';

/** Instantánea consistente de SQLite (VACUUM INTO no bloquea a los lectores y no copia a medias un archivo en escritura). */
export function snapshotDatabase(db, tmpDir) {
  const out = path.join(tmpDir, `snapshot-${process.pid}-${Date.now()}.db`);
  db.exec(`VACUUM INTO '${out.replace(/'/g, "''")}'`);
  try { return fs.readFileSync(out); } finally { fs.rmSync(out, { force: true }); }
}

/** Archivos que acompañan al índice (solo los que existen). `sources`: [{ name, path }]. */
export function readSources(sources) {
  return sources.filter((s) => fs.existsSync(s.path)).map((s) => ({ name: s.name, data: fs.readFileSync(s.path) }));
}
