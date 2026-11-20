export function createRepo(db) {
  const columns = 'id, source_id AS sourceId, url, title, artist, album, format, options_json AS optionsJson, channel, playlist, year, speed, eta, state, progress, file_id AS fileId, destination, error, created, updated';
  return {
    list: () => db.stmt('SELECT ' + columns + ' FROM music_download_jobs ORDER BY created DESC LIMIT 150').all(),
    get: (id) => db.stmt('SELECT ' + columns + ' FROM music_download_jobs WHERE id = ?').get(id),
    bySource: (sourceId, format = 'mp3') => db.stmt("SELECT " + columns + " FROM music_download_jobs WHERE source_id = ? AND format = ? AND state = 'done' ORDER BY updated DESC LIMIT 1").get(sourceId, format),
    outstanding: () => db.stmt("SELECT " + columns + " FROM music_download_jobs WHERE state = 'queued' ORDER BY created ASC").all(),
    interrupt: () => db.stmt("UPDATE music_download_jobs SET state = 'interrupted', error = 'Interrumpida por reinicio' WHERE state IN ('downloading', 'uploading', 'analyzing')").run(),
    insert: (j) => db.stmt("INSERT INTO music_download_jobs (id, source_id, url, title, artist, album, format, options_json, channel, playlist, year, state, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued', ?, ?)").run(j.id, j.sourceId, j.url, j.title, j.artist, j.album, j.format, JSON.stringify(j.options), j.channel, j.playlist, j.year, j.created, j.created),
    patch(id, fields) {
      const allowed = ['state', 'progress', 'error', 'fileId', 'destination', 'title', 'artist', 'album', 'speed', 'eta'];
      const pairs = Object.entries(fields).filter(([key]) => allowed.includes(key));
      if (!pairs.length) return;
      const names = { fileId: 'file_id' };
      const sql = 'UPDATE music_download_jobs SET ' + pairs.map(([k]) => (names[k] || k) + ' = ?').join(', ') + ', updated = ? WHERE id = ?';
      db.stmt(sql).run(...pairs.map(([, v]) => v), Date.now(), id);
    },
    delete: (id) => db.stmt("DELETE FROM music_download_jobs WHERE id = ? AND state NOT IN ('queued','downloading','uploading','analyzing')").run(id).changes > 0,
  };
}
