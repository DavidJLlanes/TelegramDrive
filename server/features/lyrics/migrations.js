export const migrations = [{
  id: '030-lyrics',
  up(db) {
    db.exec(`
      CREATE TABLE lyrics (
        msg_id     INTEGER PRIMARY KEY,
        text       TEXT NOT NULL,
        source     TEXT NOT NULL DEFAULT 'manual',
        updated_at INTEGER NOT NULL
      );`);
  },
}];
