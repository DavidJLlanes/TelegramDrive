// «Buscar letras que faltan»: recorre en segundo plano las canciones sin letra. Una a una, con la pausa que impone el cliente
// de LRCLIB, y se puede cancelar. Solo hay una pasada a la vez; el estado se consulta con status().
export function createBulk({ repo, finder, settings }) {
  let state = { running: false, total: 0, done: 0, found: 0, none: 0, failed: 0, error: '', finishedAt: 0 };
  let cancelled = false;

  async function run(ids) {
    for (const id of ids) {
      if (cancelled) break;
      try {
        const r = await finder.auto(id);
        if (r.state === 'found') state.found += 1; else state.none += 1;
      } catch (err) {
        state.failed += 1;
        // Si LRCLIB o la red fallan, seguir solo gasta tiempo: se para y se cuenta lo que hay.
        if (err.status === 502 || err.status === 503) { state.error = err.message; break; }
      }
      state.done += 1;
    }
    state = { ...state, running: false, finishedAt: Date.now() };
  }

  return {
    status: () => ({ ...state }),
    start() {
      if (state.running) return { ...state };
      const ids = repo.missing(Date.now() - settings.retryAfterMs, settings.bulkLimit);
      cancelled = false;
      state = { running: ids.length > 0, total: ids.length, done: 0, found: 0, none: 0, failed: 0, error: '', finishedAt: ids.length ? 0 : Date.now() };
      if (ids.length) run(ids);
      return { ...state };
    },
    cancel() { cancelled = true; },
  };
}
