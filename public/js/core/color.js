/** Tono (0-359) estable derivado de un texto: mismo nombre, mismo color. */
export function hueOf(text) {
  let hash = 0;
  for (const ch of String(text)) hash = (Math.imul(hash, 31) + ch.codePointAt(0)) >>> 0;
  return hash % 360;
}

/** Pinta el elemento con el color de portada de `seed` (luminosidad/croma los fija el tema en CSS). */
export function tint(el, seed) {
  el.style.setProperty('--h', hueOf(seed));
  el.classList.add('hued');
  return el;
}
