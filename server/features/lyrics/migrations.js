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
},
{
  id: '031-lyrics-lookups',
  up(db) {
    // Qué canciones ya se buscaron en internet (y con qué resultado), para no repetir búsquedas inútiles ni volver a poner una letra que se quitó.
    db.exec(`
      CREATE TABLE lyrics_lookups (
        msg_id   INTEGER PRIMARY KEY,
        tried_at INTEGER NOT NULL,
        result   TEXT NOT NULL
      );`);
  },
}];
