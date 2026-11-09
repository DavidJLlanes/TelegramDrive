import { contentUrl, zipUrl } from '../core/api.js';

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

/** ZIP de una carpeta (`{ path }`) o de una selección de archivos (`{ ids }`), en streaming. */
// `download` evita que el navegador abandone la aplicación si el servidor responde con un error (carpeta vacía, sesión caducada).
export const downloadZip = (target) => click(zipUrl(target), '');
