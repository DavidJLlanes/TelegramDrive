export const migrations = [{
  id: '041-photo-albums',
  up(db) {
    db.exec(`
      CREATE TABLE photo_albums (
        id      INTEGER PRIMARY KEY AUTOINCREMENT,
        name    TEXT NOT NULL,
        created INTEGER NOT NULL
      );
      CREATE TABLE photo_album_items (
        album_id INTEGER NOT NULL REFERENCES photo_albums(id) ON DELETE CASCADE,
        msg_id   INTEGER NOT NULL,
        added    INTEGER NOT NULL,
        PRIMARY KEY (album_id, msg_id)
      );
      CREATE INDEX photo_album_items_msg ON photo_album_items (msg_id);`);
  },
}];
