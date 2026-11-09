// Mapa de atajos (sin DOM): admite teclas sueltas, combinaciones ("ctrl+a", "shift+arrowright") y secuencias ("g h").
const SEQUENCE_MS = 1200;

export function describeKey(event) {
  const mods = [event.ctrlKey || event.metaKey ? 'ctrl' : '', event.altKey ? 'alt' : '', event.shiftKey && event.key.length > 1 ? 'shift' : ''].filter(Boolean);
  const key = event.key === ' ' ? 'space' : event.key.toLowerCase();
  return [...mods, key].join('+');
}

export function createKeymap(now = () => Date.now()) {
  const bindings = [];
  let pending = null; // { key, at }

  return {
    /** `keys`: "/", "ctrl+a", "g h". `when()` opcional: solo se activa si devuelve true. */
    bind({ keys, label, group = 'General', run, when }) { bindings.push({ steps: keys.split(' '), label, group, run, when }); },
    list: () => bindings.map(({ steps, label, group }) => ({ keys: steps.join(' '), label, group })),
    /** Devuelve true si el evento fue consumido por un atajo. */
    handle(event) {
      const key = describeKey(event);
      const first = pending && now() - pending.at < SEQUENCE_MS ? pending.key : null;
      pending = null;
      const live = (b) => !b.when || b.when();
      const full = bindings.find((b) => live(b) && (first ? b.steps.length === 2 && b.steps[0] === first && b.steps[1] === key : b.steps.length === 1 && b.steps[0] === key));
      if (full) { full.run(event); return true; }
      if (!first && bindings.some((b) => live(b) && b.steps.length === 2 && b.steps[0] === key)) { pending = { key, at: now() }; return true; }
      return false;
    },
  };
}
