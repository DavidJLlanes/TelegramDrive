// Pone la imagen de portada como fondo de toda la tarjeta de carpeta (cuerpo y pestaña). El borde fino y la pestaña toman el tono dominante de la imagen
// (en vez del color de la carpeta), y el icono se queda donde estaba. La CSP no admite style="": solo la API CSSOM.
import { folderImageUrl } from '../core/api.js';
import { coverHue } from '../core/cover-color.js';

export function withImage(card, folder) {
  const url = folderImageUrl(folder);
  card.classList.add('has-image');
  card.style.backgroundImage = `linear-gradient(to top, rgb(0 0 0 / 0.62), rgb(0 0 0 / 0) 60%), url("${url}")`;
  // la pestaña repite la imagen a ese mismo tamaño para que ambas partes se vean como una sola pieza
  new ResizeObserver(() => { card.style.setProperty('--cw', `${card.offsetWidth}px`); card.style.setProperty('--ch', `${card.offsetHeight}px`); }).observe(card);
  coverHue(url).then((hue) => { if (hue !== null && card.isConnected) card.style.setProperty('--h', hue); });
  return card;
}
