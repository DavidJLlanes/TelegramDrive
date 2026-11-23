/** Centra `node` dentro de su zona con desplazamiento (el propio `box` o, si no desborda, el contenedor `fallback`), sin mover nada más. */
export function centerIn(node, box, { fallback = null, block = 'center', smooth = true } = {}) {
  const scroller = box.scrollHeight > box.clientHeight + 1 || !fallback ? box : fallback;
  const rect = node.getBoundingClientRect(); const area = scroller.getBoundingClientRect();
  const offset = rect.top - area.top + scroller.scrollTop;
  const top = block === 'center' ? offset - scroller.clientHeight / 2 + rect.height / 2 : offset - 8;
  scroller.scrollTo({ top: Math.max(0, top), behavior: smooth ? 'smooth' : 'auto' });
}
