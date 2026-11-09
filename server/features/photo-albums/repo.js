/** Acceso a datos de los álbumes de fotos (solo SQL). Las fotos son archivos de Telegram; aquí solo se guarda la pertenencia. */
export function createRepo(db) {
  return {
    list: () => db.stmt(`SELECT a.id, a.name, a.created, COUNT(i.msg_id) AS count,
      (SELECT msg_id FROM photo_album_items WHERE album_id = a.id ORDER BY added DESC, msg_id DESC LIMIT 1) AS cover
      FROM photo_albums a LEFT JOIN photo_album_items i ON i.album_id = a.id GROUP BY a.id ORDER BY a.name COLLATE NOCASE`).all(),
    get: (id) => db.stmt('SELECT id, name, created FROM photo_albums WHERE id = ?').get(id) ?? null,
    create: (name) => Number(db.stmt('INSERT INTO photo_albums (name, created) VALUES (?, ?)').run(name, Date.now()).lastInsertRowid),
    rename: (id, name) => db.stmt('UPDATE photo_albums SET name = ? WHERE id = ?').run(name, id).changes > 0,
    remove: (id) => db.tx(() => {
      db.stmt('DELETE FROM photo_album_items WHERE album_id = ?').run(id);
      return db.stmt('DELETE FROM photo_albums WHERE id = ?').run(id).changes > 0;
    }),
    items: (id) => db.stmt('SELECT msg_id FROM photo_album_items WHERE album_id = ? ORDER BY added DESC, msg_id DESC').all(id).map((r) => r.msg_id),
    add: (id, msgIds) => db.tx(() => msgIds.reduce((n, m) => n + db.stmt('INSERT OR IGNORE INTO photo_album_items (album_id, msg_id, added) VALUES (?, ?, ?)').run(id, m, Date.now()).changes, 0)),
    removeItems: (id, msgIds) => db.tx(() => msgIds.reduce((n, m) => n + db.stmt('DELETE FROM photo_album_items WHERE album_id = ? AND msg_id = ?').run(id, m).changes, 0)),
    purgeOrphans: () => db.stmt('DELETE FROM photo_album_items WHERE msg_id NOT IN (SELECT msg_id FROM files)').run().changes,
  };
}
