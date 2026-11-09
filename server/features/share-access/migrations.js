export const migrations = [{
  id: '020-share-policy',
  up(db) {
    db.exec(`
      CREATE TABLE share_policy (
        token         TEXT PRIMARY KEY,
        pw_hash       TEXT NOT NULL DEFAULT '',
        max_downloads INTEGER NOT NULL DEFAULT 0,
        downloads     INTEGER NOT NULL DEFAULT 0
      );`);
  },
}];
