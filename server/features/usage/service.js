const KIND_ORDER = ['audio', 'image', 'video', 'file'];

/** Suma recursiva por carpeta: cada carpeta acumula lo suyo y lo de sus descendientes. */
export function rollUp(direct, parentOf) {
  const total = new Map();
  for (const [folder, d] of direct) {
    for (let f = folder; f !== undefined && f !== null; f = parentOf(f)) {
      const t = total.get(f) ?? { count: 0, bytes: 0 };
      t.count += d.count; t.bytes += d.bytes; total.set(f, t);
      if (total.size > 1e6) return total; // salvaguarda ante ciclos corruptos
    }
  }
  return total;
}

export function createService({ repo, tree, settings }) {
  return {
    report() {
      const kinds = repo.byKind();
      const total = kinds.reduce((a, k) => ({ count: a.count + k.count, bytes: a.bytes + k.bytes }), { count: 0, bytes: 0 });
      const direct = new Map(repo.byFolder().map((r) => [r.folder, { count: r.count, bytes: r.bytes }]));
      const rolled = rollUp(direct, (id) => tree.get(id)?.parent ?? null);
      const folders = [...rolled].filter(([id]) => tree.get(id)).map(([id, t]) => ({ path: tree.pathOf(id), count: t.count, bytes: t.bytes, ownBytes: direct.get(id)?.bytes ?? 0 }))
        .sort((a, b) => b.bytes - a.bytes).slice(0, settings.topFolders);
      return {
        total,
        kinds: kinds.sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind)),
        folders,
        biggest: repo.biggest(settings.topFiles).map((f) => ({ id: f.id, name: f.name, size: f.size, kind: f.kind, path: tree.pathOf(f.folder) })),
        trash: repo.trash(),
      };
    },
  };
}
