// Carpeta con imagen de portada: el SVG de la silueta la pinta recortada (cuerpo y pestaña); el borde toma su tono dominante y el icono no cambia.
import { folderImageUrl } from '../core/api.js';
import { coverHue } from '../core/cover-color.js';

export function imageFor(card, folder) {
  const url = folderImageUrl(folder);
  card.classList.add('has-image');
  coverHue(url).then((hue) => { if (hue !== null && card.isConnected) card.style.setProperty('--h', hue); });
  return url;
}
