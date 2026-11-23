// Gestos de deslizamiento con Pointer Events (táctil y ratón). Sin dependencias.
const MIN = 56;      // distancia mínima (px)
const DOMINANCE = 1.4; // el eje principal debe superar al otro en esta proporción

/**
 * `handlers`: { left, right, up, down } (todos opcionales). Un deslizamiento que empieza en un control
 * interactivo (botón, deslizador) no cuenta. Devuelve una función para retirar el gesto.
 */
export function onSwipe(el, handlers) {
  let start = null;
  const down = (e) => {
    if (e.button > 0 || e.target.closest('button, input, a, select, textarea')) return;
    start = { x: e.clientX, y: e.clientY, id: e.pointerId };
  };
  const up = (e) => {
    if (!start || e.pointerId !== start.id) return;
    const dx = e.clientX - start.x; const dy = e.clientY - start.y;
    start = null;
    const ax = Math.abs(dx); const ay = Math.abs(dy);
    if (Math.max(ax, ay) < MIN) return;
    if (ax > ay * DOMINANCE) (dx < 0 ? handlers.left : handlers.right)?.(e);
    else if (ay > ax * DOMINANCE) (dy < 0 ? handlers.up : handlers.down)?.(e);
  };
  const cancel = () => { start = null; };
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', cancel);
  return () => { el.removeEventListener('pointerdown', down); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', cancel); };
}
