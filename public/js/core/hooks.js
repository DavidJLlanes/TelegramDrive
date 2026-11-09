// Ganchos de arranque: las funciones registran aquí lo que debe ocurrir cuando la sesión ya está abierta
// (comprobaciones iniciales, avisos…), sin que main.js las conozca.
const startHooks = [];

export const onAppStart = (fn) => { startHooks.push(fn); };

export function runAppStart() {
  for (const fn of startHooks) {
    try { Promise.resolve(fn()).catch((err) => console.warn('[inicio]', err)); } catch (err) { console.warn('[inicio]', err); }
  }
}
