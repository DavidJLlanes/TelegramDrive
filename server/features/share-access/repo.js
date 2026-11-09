/** Acceso a datos de las políticas de enlaces compartidos (solo SQL). */
export function createRepo(db) {
  return {
    get: (token) => db.stmt('SELECT * FROM share_policy WHERE token = ?').get(token) ?? null,
    upsert: (token, pwHash, maxDownloads) => db.stmt(`INSERT INTO share_policy (token, pw_hash, max_downloads) VALUES (?, ?, ?)
      ON CONFLICT(token) DO UPDATE SET pw_hash = excluded.pw_hash, max_downloads = excluded.max_downloads`).run(token, pwHash, maxDownloads),
    /** Suma una descarga solo si aún queda cupo; devuelve si se pudo (atómico: sin carreras entre peticiones). */
    consume: (token) => db.stmt('UPDATE share_policy SET downloads = downloads + 1 WHERE token = ? AND (max_downloads = 0 OR downloads < max_downloads)').run(token).changes > 0,
    all: () => db.stmt('SELECT token, pw_hash <> \'\' AS protected, max_downloads, downloads FROM share_policy').all(),
    purgeOrphans: () => db.stmt('DELETE FROM share_policy WHERE token NOT IN (SELECT token FROM shares)').run(),
  };
}
