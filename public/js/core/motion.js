// Movimiento: cambios de pantalla con fundido (View Transitions) y salidas animadas de paneles, menús y avisos.
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
let batch = null;

/** Ejecuta `fn` (que repinta) dentro de una transición de vista. Las llamadas del mismo instante comparten una sola transición.
 *  Sin soporte (o con «reducir movimiento»), repinta al momento y, si se pasa `el`, relanza su fundido de entrada. */
export function swap(fn, el) {
  if (typeof document.startViewTransition !== 'function' || reduced()) {
    fn();
    if (el && !reduced()) { el.classList.remove('enter'); void el.offsetWidth; el.classList.add('enter'); }
    return;
  }
  if (batch) { batch.push(fn); return; }
  batch = [fn];
  const t = document.startViewTransition(() => { const run = batch; batch = null; run.forEach((f) => f()); });
  t.ready.catch(() => {}); t.finished.catch(() => {}); // una transición interrumpida por otra no es un error
}

/** Quita `el` tras una breve animación de salida (clase .leaving). */
export function leave(el, ms = 170) {
  if (!el?.isConnected) return;
  if (reduced()) { el.remove(); return; }
  el.classList.add('leaving');
  setTimeout(() => el.remove(), ms);
}
