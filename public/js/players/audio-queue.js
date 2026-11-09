// Lógica pura de la cola de reproducción (sin DOM): orden, aleatorio y repetición.
const shuffled = (n, first) => {
  const rest = Array.from({ length: n }, (_, i) => i).filter((i) => i !== first);
  for (let i = rest.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return first >= 0 ? [first, ...rest] : rest;
};

/** Sin canciones repetidas en la cola (se conserva la primera aparición). */
const unique = (files) => [...new Map(files.map((f) => [f.id, f])).values()];

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
      items = unique(files);
      shuffle = mix;
      const start = Math.max(items.findIndex((f) => f.id === startId), 0);
      rebuild(items.length ? start : -1);
    },

    /** Amplía la lista conservando la pista actual (p. ej. al cargar la carpeta completa). */
    extend(files) {
      const id = this.current()?.id;
      const list = unique(files);
      const at = list.findIndex((f) => f.id === id);
      if (at < 0) return false;
      items = list;
      rebuild(at);
      return true;
    },

    next(auto = false) {
      if (!items.length) return null;
      if (auto && repeat === 'one') return this.current();
      if (pos + 1 < order.length) { pos += 1; return this.current(); }
      if (repeat !== 'all') return null;
      const last = order[order.length - 1];
      rebuild(shuffle ? -1 : 0);
      // en la nueva vuelta aleatoria, la primera no puede ser la que acaba de sonar
      if (shuffle && order.length > 1 && order[0] === last) { const k = 1 + Math.floor(Math.random() * (order.length - 1)); [order[0], order[k]] = [order[k], order[0]]; }
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
      const existing = items.findIndex((f) => f.id === file.id);
      if (existing >= 0 && pos >= 0) { // ya está en la cola: se recoloca en vez de repetirla
        const from = order.indexOf(existing);
        if (from === pos) return;
        const playing = order[pos];
        order.splice(from, 1);
        const at = last ? order.length : order.indexOf(playing) + 1;
        order.splice(at, 0, existing);
        pos = order.indexOf(playing);
        return;
      }
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
      if (shuffle && current !== undefined) {
        // lo ya escuchado queda detrás y lo que falta se baraja: no se repite nada hasta terminar la vuelta
        const heard = order.slice(0, pos);
        const rest = shuffled(items.length, -1).filter((i) => i !== current && !heard.includes(i));
        order = [...heard, current, ...rest];
        pos = heard.length;
      } else rebuild(current ?? -1);
      return shuffle;
    },

    cycleRepeat() {
      repeat = REPEAT_MODES[(REPEAT_MODES.indexOf(repeat) + 1) % REPEAT_MODES.length];
      return repeat;
    },
  };
}
