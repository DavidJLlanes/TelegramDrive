/** Acceso a datos de las letras (solo SQL). */
export function createRepo(db) {
  return {
    get: (id) => db.stmt('SELECT text, source, updated_at AS updatedAt FROM lyrics WHERE msg_id = ?').get(id) ?? null,
    upsert: (id, text, source) => db.stmt(`INSERT INTO lyrics (msg_id, text, source, updated_at) VALUES (?, ?, ?, ?)
      ON CONFLICT(msg_id) DO UPDATE SET text = excluded.text, source = excluded.source, updated_at = excluded.updated_at`).run(id, text, source, Date.now()),
    remove: (id) => db.stmt('DELETE FROM lyrics WHERE msg_id = ?').run(id).changes > 0,
    lookup: (id) => db.stmt('SELECT tried_at AS triedAt, result FROM lyrics_lookups WHERE msg_id = ?').get(id) ?? null,
    markTried: (id, result) => db.stmt(`INSERT INTO lyrics_lookups (msg_id, tried_at, result) VALUES (?, ?, ?)
      ON CONFLICT(msg_id) DO UPDATE SET tried_at = excluded.tried_at, result = excluded.result`).run(id, Date.now(), result),
    /** Canciones sin letra que no se han buscado hace poco ni se les quitó la letra a propósito. */
    missing: (since, limit) => db.stmt(`SELECT f.msg_id AS id FROM files f
      LEFT JOIN lyrics l ON l.msg_id = f.msg_id LEFT JOIN lyrics_lookups k ON k.msg_id = f.msg_id
      WHERE f.kind = 'audio' AND f.hidden = 0 AND f.trashed = 0 AND l.msg_id IS NULL
        AND (k.msg_id IS NULL OR (k.result != 'removed' AND k.tried_at < ?))
      ORDER BY f.msg_id DESC LIMIT ?`).all(since, limit).map((r) => r.id),
  };
}
