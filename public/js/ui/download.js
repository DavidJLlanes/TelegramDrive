import { contentUrl } from '../core/api.js';

/** Descarga nativa del navegador (con Content-Disposition: attachment desde el servidor). */
export function download(file) {
  const a = document.createElement('a');
  a.href = contentUrl(file.id, { download: true });
  a.download = file.name;
  document.body.append(a);
  a.click();
  a.remove();
}
