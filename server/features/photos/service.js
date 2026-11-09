export function createService({ repo, catalog, scanner, settings }) {
  return {
    timeline({ offset = 0, limit = 120 } = {}) {
      const o = Math.min(Math.max(0, Math.floor(Number(offset)) || 0), 1e9);
      const l = Math.min(Math.max(1, Math.floor(Number(limit)) || 120), settings.pageMax);
      const { total, rows } = repo.timeline(o, l);
      const byId = new Map(catalog.lookup(rows.map((r) => r.id)).map((f) => [f.id, f]));
      const photos = rows.filter((r) => byId.has(r.id)).map((r) => ({
        ...byId.get(r.id), takenAt: r.at, exif: Boolean(r.exif), lat: r.lat, lon: r.lon, camera: r.camera || '',
      }));
      return { total, offset: o, photos };
    },
    status() { const c = repo.counts(); return { images: c.images, jpeg: c.total, scanned: c.scanned ?? 0, running: scanner.state.running, lastError: scanner.state.lastError }; },
    scan: () => { scanner.run(); },
  };
}
