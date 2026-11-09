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

    /** Pistas en el orden en que sonarán (con el aleatorio aplicado). */
    get ordered() { return order.map((i) => items[i]); },
    get index() { return pos; },

    jump(position) {
      if (position < 0 || position >= order.length) return null;
      pos = position;
      return this.current();
    },

    /** Quita la pista en `position`. Devuelve true si era la que sonaba (la actual pasa a ser la siguiente, o la anterior si era la última). */
    removeAt(position) {
      if (position < 0 || position >= order.length) return false;
      const idx = order[position];
      const wasCurrent = position === pos;
      items = items.filter((_, i) => i !== idx);
      order = order.filter((_, p) => p !== position).map((i) => (i > idx ? i - 1 : i));
      if (position < pos) pos -= 1;
      else if (wasCurrent && pos >= order.length) pos = order.length - 1;
      return wasCurrent;
    },

    /** Mueve la pista de `from` a `to` dentro del orden de reproducción, sin perder la actual. */
    move(from, to) {
      if (from === to || from < 0 || to < 0 || from >= order.length || to >= order.length) return;
      const playing = order[pos];
      const [item] = order.splice(from, 1);
      order.splice(to, 0, item);
      pos = order.indexOf(playing);
    },

    /** Inserta `file` justo después de la actual (o al final con `last`). */
    enqueue(file, { last = false } = {}) {
      items = [...items, file];
      const idx = items.length - 1;
      order.splice(last || pos < 0 ? order.length : pos + 1, 0, idx);
      if (pos < 0) pos = 0;
    },

    /** Restaura una cola guardada: `files` ya viene en el orden de reproducción. */
    restore(files, position, { shuffle: mix = false, repeat: mode = 'off' } = {}) {
      items = files;
      order = files.map((_, i) => i);
      pos = Math.min(Math.max(position, 0), files.length - 1);
      shuffle = mix;
      repeat = REPEAT_MODES.includes(mode) ? mode : 'off';
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
