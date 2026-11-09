// Migraciones numeradas e idempotentes para las tablas propias de cada función (las tablas base viven en schema.js).
// Regla: no se añaden columnas a `files`/`folders` (schema.js las reconstruye al subir de versión); se usan tablas laterales.
const TABLE = 'schema_migrations';

/**
 * Aplica, en orden de `id`, las migraciones que aún no constan en la base.
 * Cada migración es `{ id: '010-nombre', up(db) }` y se ejecuta dentro de una transacción.
 */
export function applyMigrations(db, migrations) {
  db.exec(`CREATE TABLE IF NOT EXISTS ${TABLE} (id TEXT PRIMARY KEY, applied INTEGER NOT NULL)`);
  const done = new Set(db.stmt(`SELECT id FROM ${TABLE}`).all().map((r) => r.id));
  const pending = [...migrations].sort((a, b) => a.id.localeCompare(b.id)).filter((m) => !done.has(m.id));
  const ids = new Set();
  for (const m of migrations) {
    if (ids.has(m.id)) throw new Error(`Migración duplicada: ${m.id}`);
    ids.add(m.id);
  }
  for (const m of pending) {
    db.tx(() => {
      m.up(db);
      db.stmt(`INSERT INTO ${TABLE} (id, applied) VALUES (?, ?)`).run(m.id, Date.now());
    });
  }
  return pending.map((m) => m.id);
}
