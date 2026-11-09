// Lógica pura de la cola de reproducción (sin DOM): orden, aleatorio y repetición.
const shuffled = (n, first) => {
  const rest = Array.from({ length: n }, (_, i) => i).filter((i) => i !== first);
  for (let i = rest.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return first >= 0 ? [first, ...rest] : rest;
};

export const REPEAT_MODES = ['off', 'all', 'one'];

export function createQueue() {
  let items = [];
  let order = [];
  let pos = -1;
  let shuffle = false;
  let repeat = 'off';

  const rebuild = (current) => {
    order = shuffle ? shuffled(items.length, current) : items.map((_, i) => i);
    pos = shuffle ? 0 : current;
  };

  return {
    get items() { return items; },
    get length() { return items.length; },
    get position() { return pos + 1; },
    get shuffle() { return shuffle; },
    get repeat() { return repeat; },
    current: () => items[order[pos]] ?? null,

    /** Sustituye la cola y sitúa la reproducción en `startId` (o en la primera pista). */
    set(files, startId, { shuffle: mix = shuffle } = {}) {
      items = files;
      shuffle = mix;
      const start = Math.max(files.findIndex((f) => f.id === startId), 0);
      rebuild(files.length ? start : -1);
    },

    /** Amplía la lista conservando la pista actual (p. ej. al cargar la carpeta completa). */
    extend(files) {
      const id = this.current()?.id;
      const at = files.findIndex((f) => f.id === id);
      if (at < 0) return false;
      items = files;
      rebuild(at);
      return true;
    },

    next(auto = false) {
      if (!items.length) return null;
      if (auto && repeat === 'one') return this.current();
      if (pos + 1 < order.length) { pos += 1; return this.current(); }
      if (repeat !== 'all') return null;
      rebuild(shuffle ? -1 : 0);
      pos = 0;
      return this.current();
    },

    prev() {
      if (pos > 0) { pos -= 1; return this.current(); }
      if (repeat === 'all' && order.length) { pos = order.length - 1; return this.current(); }
      return this.current();
    },

    toggleShuffle() {
      shuffle = !shuffle;
      const current = order[pos];
      rebuild(current ?? -1);
      return shuffle;
    },

    cycleRepeat() {
      repeat = REPEAT_MODES[(REPEAT_MODES.indexOf(repeat) + 1) % REPEAT_MODES.length];
      return repeat;
    },
  };
}
