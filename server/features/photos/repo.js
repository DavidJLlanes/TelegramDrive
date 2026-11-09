const IMAGE = "f.kind = 'image' AND f.trashed = 0 AND f.hidden = 0";
const JPEG = "(lower(f.name) LIKE '%.jpg' OR lower(f.name) LIKE '%.jpeg')";

/** Acceso a datos de las fotos (SQL). `photo_meta` es reconstruible: se vuelve a leer de los archivos. */
export function createRepo(db) {
  return {
    save: (id, m) => db.stmt(`INSERT INTO photo_meta (msg_id, taken, lat, lon, camera) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(msg_id) DO UPDATE SET taken = excluded.taken, lat = excluded.lat, lon = excluded.lon, camera = excluded.camera`)
      .run(id, m.taken ?? 0, m.lat ?? null, m.lon ?? null, m.camera ?? ''),
    pending: (limit) => db.stmt(`SELECT f.msg_id AS id FROM files f WHERE ${IMAGE} AND ${JPEG}
      AND NOT EXISTS (SELECT 1 FROM photo_meta m WHERE m.msg_id = f.msg_id) ORDER BY f.msg_id DESC LIMIT ?`).all(limit).map((r) => r.id),
    counts: () => db.stmt(`SELECT COUNT(*) AS total, SUM(EXISTS (SELECT 1 FROM photo_meta m WHERE m.msg_id = f.msg_id)) AS scanned,
      (SELECT COUNT(*) FROM files f2 WHERE f2.kind = 'image' AND f2.trashed = 0 AND f2.hidden = 0) AS images FROM files f WHERE ${IMAGE} AND ${JPEG}`).get(),
    /** Fotos de más reciente a más antigua por fecha de la toma (o, sin EXIF, la del archivo). */
    timeline: (offset, limit) => ({
      total: db.stmt(`SELECT COUNT(*) AS n FROM files f WHERE ${IMAGE}`).get().n,
      rows: db.stmt(`SELECT f.msg_id AS id, COALESCE(NULLIF(m.taken, 0), f.date) AS at, m.taken > 0 AS exif, m.lat AS lat, m.lon AS lon, m.camera AS camera
        FROM files f LEFT JOIN photo_meta m ON m.msg_id = f.msg_id WHERE ${IMAGE} ORDER BY at DESC, f.msg_id DESC LIMIT ? OFFSET ?`).all(limit, offset),
    }),
    purgeOrphans: () => db.stmt('DELETE FROM photo_meta WHERE msg_id NOT IN (SELECT msg_id FROM files)').run().changes,
  };
}
