import { h, fill } from '../../core/dom.js';
import { icon } from '../../core/icons.js';
import { toast, toastError } from '../../ui/toast.js';
import { navigate } from '../../core/router.js';
import { musicApi } from './api.js';
import { renderJobs } from './jobs.js';
import { downloadOptions } from './options.js';
import { playlistControls } from './playlist-controls.js';

const field = (name, value = '') => {
  const input = h('input', { class: 'input', value, maxlength: 180, placeholder: name });
  return { input, el: h('label', { class: 'md-field' }, h('span', {}, name), input) };
};

export function renderDownloads(el, { data }) {
  const url = h('input', { class: 'input md-url', type: 'url', placeholder: 'YouTube, Vimeo, Dailymotion o SoundCloud', autocomplete: 'off', required: true });
  const format = h('select', { class: 'input md-format', 'aria-label': 'Tipo de descarga' },
    h('option', { value: 'mp3' }, 'Solo audio (MP3)'),
    h('option', { value: 'video' }, 'Solo vídeo (MP4)'),
    h('option', { value: 'both' }, 'Audio MP3 y vídeo MP4'));
  const options = downloadOptions();
  const inspect = h('button', { class: 'btn btn-primary', type: 'submit' }, icon('search'), 'Analizar enlace');
  const preview = h('div', { class: 'md-preview' });
  const list = h('div', { class: 'md-jobs' });
  const info = h('p', { class: 'pg-hint' }, data?.available
    ? 'Audio MP3, vídeo MP4 o ambos, hasta 1 GB por archivo y sin límite de duración. Descarga solo contenido autorizado.'
    : 'yt-dlp aún no está instalado en este servidor. Consulta las instrucciones de despliegue.');
  let selected = [];
  let edited = null;
  let busy = false;
  let inspectedUrl = '';

  const refresh = async () => {
    try { const status = await musicApi.status(); if (el.isConnected) renderJobs(list, status.jobs, refresh); }
    catch (e) { if (el.isConnected) toastError(e); }
  };
  const add = async () => {
    if (!selected.length || busy) return;
    busy = true;
    try {
      const items = selected.map((item) => ({ ...item, format: format.value, options: options.values() }));
      if (edited && items.length === 1) {
        items[0].title = edited.title.input.value;
        items[0].artist = edited.artist.input.value;
        items[0].album = edited.album.input.value;
      }
      const result = await musicApi.add(items);
      toast(result.accepted.length + ' archivo(s) añadidos a la cola' +
        (result.skipped.length ? '; ' + result.skipped.length + ' ya presentes' : ''), { type: 'ok' });
      selected = [];
      fill(preview);
      url.value = '';
      await refresh();
    } catch (e) { toastError(e); }
    finally { busy = false; }
  };
  const loadPage = async (offset = 0) => {
    if (busy || !inspectedUrl) return;
    busy = true;
    fill(preview, h('p', { class: 'pg-hint' }, 'Cargando elementos de la lista…'));
    try { showPreview(await musicApi.inspect(inspectedUrl, offset)); }
    catch (err) { fill(preview); toastError(err); }
    finally { busy = false; }
  };
  const showPreview = (result) => {
    selected = result.items.map((item) => ({ ...item, playlist: result.playlist ? result.playlistTitle : '' }));
    edited = null;
    const picker = h('div', { class: 'md-preview-list' });
    if (result.items.length === 1) {
      const item = selected[0];
      edited = { title: field('Título', item.title), artist: field('Artista', item.artist), album: field('Álbum', item.album) };
      fill(picker, edited.title.el, edited.artist.el, edited.album.el,
        h('p', { class: 'pg-hint' }, 'MP3: sin artista, Por revisar; sin álbum, Singles. Vídeos: carpeta Vídeos.'));
    } else {
      fill(picker, ...selected.map((item) => {
        const check = h('input', { type: 'checkbox', checked: true, onchange: (e) => {
          if (e.target.checked) selected.push(item);
          else selected = selected.filter((x) => x.id !== item.id);
        } });
        return h('label', { class: 'md-pick' }, check,
          h('span', {}, item.title), h('small', {}, item.artist || 'Por revisar'));
      }));
    }
    fill(preview, h('div', { class: 'md-preview-title' },
      h('strong', {}, result.playlist ? 'Elementos de la lista' : 'Revisa los datos del archivo'),
      result.truncated ? h('small', {}, '50 elementos por página') : null),
      playlistControls(result, loadPage), picker, h('button', { class: 'btn btn-primary', type: 'button', onclick: add },
        icon('download'), 'Añadir a descargas'));
  };

  const form = h('form', { class: 'md-form', onsubmit: async (e) => {
    e.preventDefault();
    if (busy) return;
    busy = true;
    inspect.disabled = true;
    inspect.textContent = 'Analizando…';
    fill(preview, h('p', { class: 'pg-hint' }, 'Consultando los metadatos de la fuente…'));
    try { inspectedUrl = url.value; showPreview(await musicApi.inspect(inspectedUrl, 0)); }
    catch (err) { fill(preview); toastError(err); }
    finally { busy = false; inspect.disabled = false; fill(inspect, icon('search'), 'Analizar enlace'); }
  } }, h('label', { class: 'md-field' }, h('span', {}, 'Enlace de YouTube, Vimeo, Dailymotion o SoundCloud'), url),
    h('label', { class: 'md-field' }, h('span', {}, 'Descargar como'), format), options.element, inspect, info, preview);

  fill(el, h('section', { class: 'pg-panel md-panel' }, h('h2', {}, 'Nueva descarga'),
    h('p', { class: 'pg-hint' }, 'MP3: Descargas de Internet / Artista / Álbum · Vídeo: Descargas de Internet / Vídeos'),
    form), h('section', { class: 'pg-panel md-panel' },
    h('div', { class: 'md-heading' }, h('h2', {}, 'Historial y cola'),
      h('button', { class: 'btn btn-ghost', onclick: () => navigate('/Descargas de Internet') },
        icon('folder'), 'Abrir carpeta')), list));
  renderJobs(list, data?.jobs, refresh);
  const poll = async () => {
    if (!el.isConnected) return;
    try { await refresh(); } catch { /* la vista sigue disponible */ }
    if (el.isConnected) setTimeout(poll, 3500);
  };
  setTimeout(poll, 3500);
}
