/** Acceso a datos del registro de accesos (solo SQL). */
export function createRepo(db) {
  return {
    insert: (e) => db.stmt('INSERT INTO access_log (ts, event, ok, ip, agent, detail) VALUES (?, ?, ?, ?, ?, ?)')
      .run(e.ts, e.event, e.ok ? 1 : 0, e.ip, e.agent, e.detail),
    list: (limit, event) => (event
      ? db.stmt('SELECT * FROM access_log WHERE event = ? ORDER BY id DESC LIMIT ?').all(event, limit)
      : db.stmt('SELECT * FROM access_log ORDER BY id DESC LIMIT ?').all(limit)),
    countFailsSince: (since, ip) => db.stmt("SELECT COUNT(*) AS n FROM access_log WHERE ok = 0 AND event = 'login' AND ts >= ? AND ip = ?").get(since, ip).n,
    failsSince: (since) => db.stmt("SELECT COUNT(*) AS n FROM access_log WHERE ok = 0 AND event = 'login' AND ts >= ?").get(since).n,
    lastLogin: () => db.stmt("SELECT ts, ip, agent FROM access_log WHERE ok = 1 AND event = 'login' ORDER BY id DESC LIMIT 1").get() ?? null,
    prune: (before, maxRows) => {
      db.stmt('DELETE FROM access_log WHERE ts < ?').run(before);
      db.stmt('DELETE FROM access_log WHERE id <= (SELECT MAX(id) FROM access_log) - ?').run(maxRows);
    },
    deviceCount: () => db.stmt('SELECT COUNT(*) AS n FROM access_devices').get().n,
    getDevice: (id) => db.stmt('SELECT * FROM access_devices WHERE id = ?').get(id) ?? null,
    addDevice: (d) => db.stmt('INSERT INTO access_devices (id, label, first_seen, last_seen, last_ip, seen, acked) VALUES (?, ?, ?, ?, ?, 1, ?)')
      .run(d.id, d.label, d.ts, d.ts, d.ip, d.acked ? 1 : 0),
    touchDevice: (id, ts, ip) => db.stmt('UPDATE access_devices SET last_seen = ?, last_ip = ?, seen = seen + 1 WHERE id = ?').run(ts, ip, id),
    devices: () => db.stmt('SELECT * FROM access_devices ORDER BY last_seen DESC').all(),
    ackDevices: () => db.stmt('UPDATE access_devices SET acked = 1 WHERE acked = 0').run(),
  };
}
