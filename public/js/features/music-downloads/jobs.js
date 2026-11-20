import { h, fill } from '../../core/dom.js';
import { icon } from '../../core/icons.js';
import { navigate } from '../../core/router.js';
import { musicApi } from './api.js';
import { toastError, toast } from '../../ui/toast.js';

const LABELS = {
  queued: 'En cola', analyzing: 'Analizando', downloading: 'Descargando archivo',
  uploading: 'Subiendo a Telegram', done: 'Guardado', failed: 'Error',
  cancelled: 'Cancelada', interrupted: 'Interrumpida',
};
const ACTIVE = new Set(['queued', 'analyzing', 'downloading', 'uploading']);

function action(label, iconName, callback) {
  return h('button', { type: 'button', class: 'btn btn-ghost', onclick: callback }, icon(iconName), label);
}

export function renderJobs(el, list, refresh) {
  const jobs = list || [];
  if (!jobs.length) {
    fill(el, h('p', { class: 'pg-hint' }, 'Todavía no has descargado música desde aquí.'));
    return;
  }
  const makeAction = (j, name, iconName, call) => action(name, iconName, async () => {
    try { await call(j.id); toast('Descarga actualizada'); refresh(); } catch (e) { toastError(e); }
  });
  fill(el, ...jobs.map((j) => {
    const badge = h('span', { class: 'pg-badge ' + (j.state === 'done' ? 'ok' : j.state === 'failed' ? 'warn' : '') },
      LABELS[j.state] || j.state);
    const progress = ACTIVE.has(j.state) && j.state !== 'queued'
      ? h('progress', { value: j.progress || 0, max: 100 }) : null;
    return h('div', { class: 'md-job' },
      h('div', { class: 'md-job-info' },
        h('strong', { title: j.title, 'data-format': j.format }, j.format === 'video' ? 'Vídeo · ' + (j.title || 'Sin título') : j.title || 'Canción'),
        h('span', {}, [j.artist, j.album].filter(Boolean).join(' · ') || 'Pendiente de clasificar'),
        h('span', { class: 'md-destination' }, j.destination || '/Descargas de Internet'),
        j.error ? h('span', { class: 'md-error' }, j.error) : null,
        (j.speed || j.eta) && ACTIVE.has(j.state) ? h('span', {}, [j.speed, j.eta ? 'Tiempo restante: ' + j.eta : ''].filter(Boolean).join(' · ')) : null, progress),
      h('div', { class: 'md-job-actions' }, badge,
        j.state === 'queued' ? action(j.priority > 0 ? 'Prioritaria' : 'Priorizar', 'arrow-up', async () => {
          try { await musicApi.priority(j.id, j.priority > 0 ? 0 : 1); refresh(); } catch (e) { toastError(e); }
        }) : null,
        j.state === 'done' ? action('Abrir', 'folder', () => navigate(j.destination)) : null,
        ['failed', 'cancelled', 'interrupted'].includes(j.state)
          ? makeAction(j, 'Reintentar', 'refresh', musicApi.retry) : null,
        ACTIVE.has(j.state) && j.state !== 'uploading'
          ? makeAction(j, 'Cancelar', 'close', musicApi.cancel) : null,
        !ACTIVE.has(j.state) ? makeAction(j, 'Quitar', 'trash', musicApi.remove) : null));
  }));
}
