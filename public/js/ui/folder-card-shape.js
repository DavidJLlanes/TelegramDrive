// Silueta exacta de la tarjeta de carpeta (cuerpo + pestaña) a cualquier tamaño: recorta el fondo con un trazado SVG y dibuja UN solo borde
// que sigue ese contorno (sin costuras entre pestaña y cuerpo). La CSP no admite style="": solo la API CSSOM.
import { folderPath } from './folder-shape.js';

const NS = 'http://www.w3.org/2000/svg';
const STROKE = 1.5;

export function shapeCard(card) {
  const svg = document.createElementNS(NS, 'svg');
  const outline = document.createElementNS(NS, 'path');
  svg.setAttribute('class', 'sleeve-outline'); svg.setAttribute('aria-hidden', 'true');
  svg.append(outline);
  card.append(svg);
  new ResizeObserver(() => {
    const w = card.offsetWidth; const h = card.offsetHeight;
    if (!w || !h) return;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    outline.setAttribute('d', folderPath(w, h, STROKE / 2));
    card.style.setProperty('--clip-shape', `path("${folderPath(w, h)}")`);
  }).observe(card);
  return card;
}
