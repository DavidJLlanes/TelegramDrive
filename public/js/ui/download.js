import { contentUrl, zipUrl, thumbUrl } from '../core/api.js';

function click(href, name) {
  const a = document.createElement('a');
  a.href = href;
  if (name) a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
}

/** Descarga nativa del navegador (con Content-Disposition: attachment desde el servidor). */
export const download = (file) => click(contentUrl(file.id, { download: true }), file.name);

/** Descarga la carátula de una canción como JPEG (se guarda en WebP, que no abren todos los programas), con el nombre de la canción. */
export async function downloadCover(file) {
  const bitmap = await createImageBitmap(await (await fetch(thumbUrl(file.id))).blob());
  const canvas = Object.assign(document.createElement('canvas'), { width: bitmap.width, height: bitmap.height });
  canvas.getContext('2d').drawImage(bitmap, 0, 0);
  const jpeg = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
  const url = URL.createObjectURL(jpeg);
  click(url, `${file.name.replace(/\.[^.]+$/, '')} (carátula).jpg`);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** ZIP de una carpeta (`{ path }`) o de una selección de archivos (`{ ids }`), en streaming. */
// `download` evita que el navegador abandone la aplicación si el servidor responde con un error (carpeta vacía, sesión caducada).
export const downloadZip = (target) => click(zipUrl(target), '');
