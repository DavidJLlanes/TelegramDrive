import { h } from '../../core/dom.js';
import { icon } from '../../core/icons.js';
import { toast, toastError } from '../../ui/toast.js';
import { musicApi } from './api.js';
import { folderField } from './folder-field.js';

export function directDownloadForm(refresh) {
  const input = h('input', { class: 'input md-url', type: 'url',
    placeholder: 'https://ejemplo.com/archivo.zip', required: true, autocomplete: 'off' });
  const folder = folderField();
  const submit = h('button', { class: 'btn btn-primary', type: 'submit' },
    icon('download'), 'Descargar archivo');
  return h('section', { class: 'pg-panel md-panel' },
    h('h2', {}, 'Descarga directa de archivos'),
    h('p', { class: 'pg-hint' },
      'HTTPS público · MP3, M4A, Opus, MP4, MKV, WebM, PDF, ZIP, TXT, JPG, PNG, WebP y EPUB · Máximo 1 GB. ' +
      'Sin carpeta, se clasifican en Descargas de Internet / Archivos directos. ' +
      'Por seguridad no se siguen redirecciones.'),
    h('form', { class: 'md-form', onsubmit: async (event) => {
      event.preventDefault();
      submit.disabled = true;
      try {
        const result = await musicApi.addDirect(input.value, folder.value());
        toast(result.accepted.length ? 'Archivo añadido a la cola' : 'Archivo ya descargado', { type: 'ok' });
        input.value = '';
        refresh();
      } catch (error) { toastError(error); }
      finally { submit.disabled = false; }
    } }, h('label', { class: 'md-field' }, h('span', {}, 'URL directa del archivo'), input), folder.element, submit));
}
