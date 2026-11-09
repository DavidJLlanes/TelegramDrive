/** Lee las canciones indexadas (solo lectura sobre `files`). */
export function createRepo(db) {
  return {
    audio: () => db.stmt(`SELECT msg_id AS id, folder, name, tagged, title, artist, band, album, track, disc, year
      FROM files WHERE kind = 'audio' AND trashed = 0 AND hidden = 0`).all(),
  };
}
