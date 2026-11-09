// SQLite como caché del índice. Telegram sigue siendo la fuente de verdad: si se pierde, se reconstruye.
// Usa el SQLite integrado de Node (>= 22.5); si no existe, cae a better-sqlite3 (dependencia opcional).
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const SCHEMA_VERSION = 2;

function driver() {
  if (process.env.SQLITE_DRIVER !== 'better-sqlite3') {
    try {
      const { DatabaseSync } = require('node:sqlite');
      return { name: 'node:sqlite', open: (file) => new DatabaseSync(file) };
    } catch { /* Node < 22.5 */ }
  }
  try {
    const Better = require('better-sqlite3');
    return { name: 'better-sqlite3', open: (file) => new Better(file) };
  } catch {
    throw new Error('Se necesita Node >= 22.5 (SQLite integrado) o "npm install better-sqlite3".');
  }
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS folders (
  id     TEXT PRIMARY KEY,
  msg_id INTEGER NOT NULL UNIQUE,
  parent TEXT NOT NULL,
  name   TEXT NOT NULL COLLATE NOCASE,
  UNIQUE (parent, name)
);
CREATE TABLE IF NOT EXISTS files (
  msg_id INTEGER PRIMARY KEY,
  folder TEXT NOT NULL,
  name   TEXT NOT NULL COLLATE NOCASE,
  key    TEXT NOT NULL,
  size   INTEGER NOT NULL,
  mime   TEXT NOT NULL,
  kind   TEXT NOT NULL,
  date   INTEGER NOT NULL,
  thumb  INTEGER NOT NULL DEFAULT 0,
  UNIQUE (folder, name)
);
CREATE INDEX IF NOT EXISTS files_folder_kind ON files (folder, kind);
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
`;

export function openDatabase(file) {
  const d = driver();
  const db = d.open(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA busy_timeout = 5000;');
  const version = db.prepare('PRAGMA user_version').get().user_version;
  if (version < SCHEMA_VERSION) {
    db.exec(SCHEMA);
    db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  }

  const cache = new Map();
  const stmt = (sql) => {
    let s = cache.get(sql);
    if (!s) { s = db.prepare(sql); cache.set(sql, s); }
    return s;
  };
  const tx = (fn) => {
    db.exec('BEGIN');
    try { const out = fn(); db.exec('COMMIT'); return out; } catch (err) { db.exec('ROLLBACK'); throw err; }
  };
  const meta = {
    get: (key) => stmt('SELECT value FROM meta WHERE key = ?').get(key)?.value ?? null,
    set: (key, value) => stmt('INSERT INTO meta(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, String(value)),
  };
  return { stmt, tx, meta, exec: (sql) => db.exec(sql), close: () => db.close(), driver: d.name };
}

export const isUniqueViolation = (err) => /UNIQUE constraint failed/i.test(err?.message ?? '');

/** Ejecuta `fn(chunk)` sobre trozos de ≤500 elementos (límite de parámetros de SQLite). */
export function inChunks(items, fn, size = 500) {
  for (let i = 0; i < items.length; i += size) fn(items.slice(i, i + size));
}
