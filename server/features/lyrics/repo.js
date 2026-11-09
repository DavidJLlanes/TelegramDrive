/** Acceso a datos de las letras (solo SQL). */
export function createRepo(db) {
  return {
    get: (id) => db.stmt('SELECT text, source, updated_at AS updatedAt FROM lyrics WHERE msg_id = ?').get(id) ?? null,
    upsert: (id, text, source) => db.stmt(`INSERT INTO lyrics (msg_id, text, source, updated_at) VALUES (?, ?, ?, ?)
      ON CONFLICT(msg_id) DO UPDATE SET text = excluded.text, source = excluded.source, updated_at = excluded.updated_at`).run(id, text, source, Date.now()),
    remove: (id) => db.stmt('DELETE FROM lyrics WHERE msg_id = ?').run(id).changes > 0,
  };
}
