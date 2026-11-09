// Esquema SQLite (v4) y migraciones. La base es solo una caché: Telegram es la fuente de verdad.
export const SCHEMA_VERSION = 4;

const TEXT = (extra = '') => `TEXT NOT NULL DEFAULT ''${extra}`;
const INT = 'INTEGER NOT NULL DEFAULT 0';

// Columnas de archivo añadidas a lo largo de las versiones (etiquetas, papelera, etc.).
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS folders (
  id      TEXT PRIMARY KEY,
  msg_id  INTEGER NOT NULL UNIQUE,
  parent  TEXT NOT NULL,
  name    TEXT NOT NULL COLLATE NOCASE,
  trashed ${INT}
);
CREATE UNIQUE INDEX IF NOT EXISTS folders_name ON folders (parent, name) WHERE trashed = 0;
CREATE TABLE IF NOT EXISTS files (
  msg_id   INTEGER PRIMARY KEY,
  folder   TEXT NOT NULL,
  name     TEXT NOT NULL COLLATE NOCASE,
  key      TEXT NOT NULL,
  size     INTEGER NOT NULL,
  mime     TEXT NOT NULL,
  kind     TEXT NOT NULL,
  date     INTEGER NOT NULL,
  thumb    ${INT},
  tagged   ${INT},
  title    ${TEXT()},
  artist   ${TEXT(' COLLATE NOCASE')},
  album    ${TEXT(' COLLATE NOCASE')},
  band     ${TEXT(' COLLATE NOCASE')},
  genre    ${TEXT(' COLLATE NOCASE')},
  track    ${INT},
  disc     ${INT},
  year     ${INT},
  duration ${INT},
  tkey     ${TEXT()},
  raw      ${TEXT()},
  ovr      ${TEXT()},
  trashed  ${INT},
  hidden   ${INT}
);
CREATE UNIQUE INDEX IF NOT EXISTS files_name ON files (folder, name) WHERE trashed = 0;
CREATE INDEX IF NOT EXISTS files_folder_kind ON files (folder, kind);
CREATE INDEX IF NOT EXISTS files_pending ON files (kind, tagged);
CREATE INDEX IF NOT EXISTS files_band ON files (band, album);
CREATE INDEX IF NOT EXISTS files_genre ON files (genre);
CREATE INDEX IF NOT EXISTS files_trashed ON files (trashed) WHERE trashed > 0;
CREATE TABLE IF NOT EXISTS playlists (
  id     TEXT PRIMARY KEY,
  msg_id INTEGER NOT NULL UNIQUE,
  name   TEXT NOT NULL COLLATE NOCASE,
  ids    TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS shares (
  token   TEXT PRIMARY KEY,
  kind    TEXT NOT NULL,
  target  TEXT NOT NULL,
  label   TEXT NOT NULL,
  exp     INTEGER NOT NULL,
  created INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
`;

const tableExists = (db, name) => Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name));
const columnsOf = (db, table) => db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);

/** Crea el esquema actual; si hay tablas de una versión anterior, las reconstruye conservando los datos. */
export function migrate(db) {
  db.exec('BEGIN');
  try {
    const old = ['folders', 'files'].filter((t) => tableExists(db, t));
    for (const table of old) {
      db.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = ? AND sql IS NOT NULL").all(table)
        .forEach((i) => db.exec(`DROP INDEX IF EXISTS ${i.name}`));
      db.exec(`ALTER TABLE ${table} RENAME TO ${table}_old`);
    }
    db.exec(SCHEMA);
    for (const table of old) {
      const fresh = new Set(columnsOf(db, table));
      const cols = columnsOf(db, `${table}_old`).filter((c) => fresh.has(c)).join(', ');
      db.exec(`INSERT INTO ${table} (${cols}) SELECT ${cols} FROM ${table}_old`);
      db.exec(`DROP TABLE ${table}_old`);
    }
    // Releer etiquetas: rellena duración, claves de búsqueda y datos originales.
    db.exec("UPDATE files SET tagged = 0 WHERE kind = 'audio' AND tagged = 1 AND raw = ''");
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
