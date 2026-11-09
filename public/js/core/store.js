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

const read = (key, fallback) => { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } };
const write = (key, value) => { try { localStorage.setItem(key, value); } catch { /* modo privado */ } };

export const prefs = {
  view: read('tgd.view', 'grid'),
  sort: read('tgd.sort', 'name'),
  volume: Number(read('tgd.volume', '0.8')),
  save(key, value) { this[key] = value; write(`tgd.${key}`, String(value)); },
};

export const appState = createStore({
  path: '/', folders: [], files: [], total: 0, loadingMore: false, loading: true, query: '', results: null,
  view: prefs.view, sort: prefs.sort, stats: null, playingId: null,
});
