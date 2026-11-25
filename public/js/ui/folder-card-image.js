// Pone la imagen de portada como fondo de toda la tarjeta de carpeta (cuerpo y pestaña, recortada con la silueta exacta) y dibuja un único
// borde fino que sigue ese contorno y toma el tono de la imagen; el icono no cambia. La CSP no admite style="": solo la API CSSOM.
import { folderImageUrl } from '../core/api.js';
import { coverHue } from '../core/cover-color.js';
import { folderPath } from './folder-shape.js';

const NS = 'http://www.w3.org/2000/svg';
const STROKE = 1.5;

export function withImage(card, folder) {
  const url = folderImageUrl(folder);
  const outline = document.createElementNS(NS, 'path');
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'sleeve-outline'); svg.setAttribute('aria-hidden', 'true');
  svg.append(outline);
  card.classList.add('has-image');
  card.append(svg);
  card.style.backgroundImage = `linear-gradient(to top, rgb(0 0 0 / 0.62), rgb(0 0 0 / 0) 60%), url("${url}")`;
  new ResizeObserver(() => {
    const w = card.offsetWidth; const h = card.offsetHeight;
    if (!w || !h) return;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    outline.setAttribute('d', folderPath(w, h, STROKE / 2));
    card.style.setProperty('--clip-shape', `path("${folderPath(w, h)}")`);
  }).observe(card);
  coverHue(url).then((hue) => { if (hue !== null && card.isConnected) card.style.setProperty('--h', hue); });
  return card;
}
