/** Consultas de agregación sobre el índice (solo lectura). */
export function createRepo(db) {
  const live = 'trashed = 0 AND hidden = 0';
  return {
    byKind: () => db.stmt(`SELECT kind, COUNT(*) AS count, COALESCE(SUM(size), 0) AS bytes FROM files WHERE ${live} GROUP BY kind`).all(),
    byFolder: () => db.stmt(`SELECT folder, COUNT(*) AS count, COALESCE(SUM(size), 0) AS bytes FROM files WHERE ${live} GROUP BY folder`).all(),
    biggest: (limit) => db.stmt(`SELECT msg_id AS id, name, size, kind, folder FROM files WHERE ${live} ORDER BY size DESC, msg_id LIMIT ?`).all(limit),
    trash: () => db.stmt('SELECT COUNT(*) AS count, COALESCE(SUM(size), 0) AS bytes FROM files WHERE trashed > 0').get(),
  };
}
