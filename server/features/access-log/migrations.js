export const migrations = [{
  id: '010-access-log',
  up(db) {
    db.exec(`
      CREATE TABLE access_log (
        id     INTEGER PRIMARY KEY AUTOINCREMENT,
        ts     INTEGER NOT NULL,
        event  TEXT NOT NULL,
        ok     INTEGER NOT NULL,
        ip     TEXT NOT NULL DEFAULT '',
        agent  TEXT NOT NULL DEFAULT '',
        detail TEXT NOT NULL DEFAULT ''
      );
      CREATE INDEX access_log_ts ON access_log (ts);
      CREATE TABLE access_devices (
        id         TEXT PRIMARY KEY,
        label      TEXT NOT NULL,
        first_seen INTEGER NOT NULL,
        last_seen  INTEGER NOT NULL,
        last_ip    TEXT NOT NULL DEFAULT '',
        seen       INTEGER NOT NULL DEFAULT 1,
        acked      INTEGER NOT NULL DEFAULT 0
      );`);
  },
}];
