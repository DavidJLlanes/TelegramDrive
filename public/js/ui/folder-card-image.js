// Pone la imagen de portada como fondo de toda la tarjeta de carpeta (cuerpo y pestaña; la silueta la recorta folder-card-shape.js).
// El borde toma el tono dominante de la imagen y el icono no cambia.
import { folderImageUrl } from '../core/api.js';
import { coverHue } from '../core/cover-color.js';

export function withImage(card, folder) {
  const url = folderImageUrl(folder);
  card.classList.add('has-image');
  card.style.backgroundImage = `linear-gradient(to top, rgb(0 0 0 / 0.62), rgb(0 0 0 / 0) 60%), url("${url}")`;
  coverHue(url).then((hue) => { if (hue !== null && card.isConnected) card.style.setProperty('--h', hue); });
  return card;
}
