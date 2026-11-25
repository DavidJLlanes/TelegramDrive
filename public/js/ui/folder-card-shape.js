// La tarjeta de carpeta se pinta entera en un SVG detrás del contenido: relleno (degradado del color de la carpeta o la imagen de portada)
// y borde salen del MISMO trazado, así que el borde tapa exactamente el canto del relleno: sin halos, sin costuras y con el mismo grosor
// en todo el contorno. La tarjeta en sí no tiene fondo ni recorte.
import { folderPath } from './folder-shape.js';

const NS = 'http://www.w3.org/2000/svg';
const STROKE = 1.5;
let uid = 0;
const el = (name, attrs = {}) => { const node = document.createElementNS(NS, name); for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v); return node; };

/** `image`: URL de la portada (opcional). */
export function shapeCard(card, image = null) {
  const id = `sl${(uid += 1)}`;
  const svg = el('svg', { class: 'sleeve-shape', 'aria-hidden': 'true', preserveAspectRatio: 'none' });
  const clip = el('clipPath', { id: `${id}c` });
  const clipPath = el('path');
  const grad = el('linearGradient', { id: `${id}g`, x1: '0', y1: '0', x2: '0.45', y2: '1' });
  grad.append(el('stop', { offset: '0', class: 'sa' }), el('stop', { offset: '1', class: 'sb' }));
  const shade = el('linearGradient', { id: `${id}s`, x1: '0', y1: '0', x2: '0', y2: '1' });
  shade.append(el('stop', { offset: '0.4', 'stop-color': '#000', 'stop-opacity': '0' }), el('stop', { offset: '1', 'stop-color': '#000', 'stop-opacity': '0.62' }));
  clip.append(clipPath);
  const defs = el('defs'); defs.append(clip, grad, shade);
  const fill = el('path', { class: 'sleeve-fill', fill: `url(#${id}g)` });
  const pic = image ? el('image', { href: image, preserveAspectRatio: 'xMidYMid slice', 'clip-path': `url(#${id}c)` }) : null;
  const dim = image ? el('rect', { fill: `url(#${id}s)`, 'clip-path': `url(#${id}c)`, x: 0, y: 0 }) : null;
  const outline = el('path', { class: 'sleeve-outline' });
  svg.append(defs, fill, ...(image ? [pic, dim] : []), outline);
  card.prepend(svg);
  new ResizeObserver(() => {
    const w = card.offsetWidth; const h = card.offsetHeight;
    if (!w || !h) return;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    const d = folderPath(w, h, STROKE / 2); // relleno y borde comparten trazado: el trazo cubre el canto del relleno
    fill.setAttribute('d', d); outline.setAttribute('d', d); clipPath.setAttribute('d', d);
    for (const node of [pic, dim]) if (node) { node.setAttribute('width', w); node.setAttribute('height', h); }
  }).observe(card);
  return card;
}
