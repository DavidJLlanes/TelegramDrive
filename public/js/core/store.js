/** Estado mínimo observable. */
export function createStore(initial) {
  let state = initial;
  const subs = new Set();
  return {
    get: () => state,
    set(patch) {
      state = { ...state, ...patch };
      subs.forEach((fn) => fn(state));
    },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
  };
}

/** Suscribe `fn` mientras `el` siga en la página: al volver a pintar la aplicación (p. ej. tras volver a entrar) se libera sola. */
export function watch(store, el, fn) {
  let seen = false;
  const off = store.subscribe((s) => {
    if (el.isConnected) seen = true;
    else if (seen) { off(); return; }
    fn(s);
  });
  return off;
}

const read = (key, fallback) => { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } };
const write = (key, value) => { try { localStorage.setItem(key, value); } catch { /* modo privado */ } };

export const prefs = {
  view: read('tgd.view', 'grid'),
  sort: read('tgd.sort', 'name'),
  volume: Number(read('tgd.volume', '0.8')),
  save(key, value) { this[key] = value; write(`tgd.${key}`, String(value)); },
};

export const appState = createStore({
  selected: [], offline: false, trash: { loading: true, folders: [], files: [], days: 30 },
  section: 'files', lib: { view: 'albums', loading: true, items: [], tracks: [] },
  path: '/', folders: [], files: [], folderPaths: [], total: 0, loadingMore: false, loading: true, query: '', results: null,
  view: prefs.view, sort: prefs.sort, stats: null, playingId: null,
});
