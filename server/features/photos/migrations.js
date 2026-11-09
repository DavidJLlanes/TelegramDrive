export const migrations = [{
  id: '040-photo-meta',
  up(db) {
    db.exec(`
      CREATE TABLE photo_meta (
        msg_id INTEGER PRIMARY KEY,
        taken  INTEGER NOT NULL DEFAULT 0,
        lat    REAL,
        lon    REAL,
        camera TEXT NOT NULL DEFAULT ''
      );`);
  },
}];
