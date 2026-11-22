import { h } from '../../core/dom.js';
import { icon } from '../../core/icons.js';
import { toast, toastError } from '../../ui/toast.js';
import { musicApi } from './api.js';

export function spotifyDownloadForm(refresh, available, error = '') {
  const input = h('input', { class: 'input md-url', type: 'url', required: true,
    autocomplete: 'off', placeholder: 'https://open.spotify.com/playlist/…' });
  const submit = h('button', { class: 'btn btn-primary', type: 'submit' },
    icon('download'), 'Añadir música de Spotify');
  return h('section', { class: 'pg-panel md-panel' },
    h('h2', {}, 'Spotify · SpotDL'),
    h('p', { class: 'pg-hint' }, 'Canciones, álbumes y listas públicas (máximo 150 pistas por trabajo). ' +
      'SpotDL utiliza metadatos de Spotify y obtiene audio coincidente de YouTube Music; no descarga los archivos de Spotify. ' +
      'Las listas se guardan como MP3 en Descargas de Internet / Listas / Nombre de la lista; ' +
      'los álbumes y las canciones sueltas, en Descargas de Internet / Artista / Álbum. ' +
      (available ? '' : 'SpotDL no está disponible en el servidor. ' +
        (error ? 'Diagnóstico: ' + error + '. ' : '') +
        'Ejecuta bash deploy/deploy.sh desde el VPS.')),
    h('form', { class: 'md-form', onsubmit: async (event) => {
      event.preventDefault();
      submit.disabled = true;
      try {
        const result = await musicApi.addSpotify(input.value);
        toast(result.accepted.length ? 'Spotify añadido a la cola' : 'Esta descarga ya está guardada', { type: 'ok' });
        input.value = '';
        await refresh();
      } catch (error) { toastError(error); }
      finally { submit.disabled = false; }
    } }, h('label', { class: 'md-field' }, h('span', {}, 'Enlace público de Spotify'), input), submit));
}
