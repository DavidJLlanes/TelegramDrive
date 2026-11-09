const parse = (text) => String(text || '').split(',').filter(Boolean).map(Number);

/** Listas de reproducción: el contenido real vive en un mensaje de Telegram; aquí solo se cachea. */
export class PlaylistsRepo {
  constructor(db) { this.db = db; }

  upsert({ id, msgId, name, ids }) {
    this.db.stmt(`INSERT INTO playlists (id, msg_id, name, ids) VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET msg_id = excluded.msg_id, name = excluded.name, ids = excluded.ids`)
      .run(id, msgId, name, ids.join(','));
  }

  #row(row) { return row && { id: row.id, msgId: row.msg_id, name: row.name, ids: parse(row.ids) }; }
  get(id) { return this.#row(this.db.stmt('SELECT * FROM playlists WHERE id = ?').get(id)); }
  all() { return this.db.stmt('SELECT * FROM playlists ORDER BY name').all().map((r) => this.#row(r)); }
  remove(id) { this.db.stmt('DELETE FROM playlists WHERE id = ?').run(id); }
  allMsgIds() { return this.db.stmt('SELECT id, msg_id AS msgId FROM playlists').all(); }
}
