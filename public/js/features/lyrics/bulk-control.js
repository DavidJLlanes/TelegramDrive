// Control de «Buscar letras que faltan» (en Configuración): inicia o cancela la pasada del servidor y muestra el progreso.
import { h, fill } from '../../core/dom.js';
import { toast, toastError } from '../../ui/toast.js';
import { lyricsApi } from './api.js';

const plural = (n, one, many) => `${n.toLocaleString('es-ES')} ${n === 1 ? one : many}`;

function describe(s) {
  if (s.running) return `Buscando… ${s.done} de ${s.total} · ${plural(s.found, 'letra encontrada', 'letras encontradas')}`;
  if (s.finishedAt && s.total === 0) return 'No hay canciones pendientes: todas tienen letra o ya se buscaron hace poco.';
  if (s.finishedAt) {
    const tail = s.error ? ` Se detuvo: ${s.error}` : '';
    return `Última pasada: ${plural(s.found, 'letra encontrada', 'letras encontradas')} en ${plural(s.done, 'canción revisada', 'canciones revisadas')}; ${s.none} sin coincidencia segura.${tail}`;
  }
  return 'Busca en LRCLIB las canciones que aún no tienen letra. Solo guarda las coincidencias seguras; el resto se puede buscar a mano desde el reproductor.';
}

export function createBulkControl() {
  const text = h('p', { class: 'pg-hint', role: 'status' });
  const bar = h('progress', { class: 'lf-progress', max: 1, value: 0, hidden: true, 'aria-label': 'Progreso de la búsqueda' });
  const button = h('button', { class: 'btn btn-primary', type: 'button' });
  const root = h('div', { class: 'lf-bulk' }, text, bar, h('div', { class: 'lf-bulk-actions' }, button));
  let state = null; let timer = 0; let wasRunning = false;

  function paint(s) {
    state = s;
    text.textContent = describe(s);
    bar.hidden = !s.running; bar.max = Math.max(s.total, 1); bar.value = s.done;
    fill(button, s.running ? 'Cancelar' : 'Buscar letras que faltan');
    button.classList.toggle('btn-primary', !s.running);
    if (wasRunning && !s.running) toast(s.found ? `${plural(s.found, 'letra encontrada', 'letras encontradas')}` : 'Búsqueda terminada: sin letras nuevas', { type: s.found ? 'ok' : undefined });
    wasRunning = s.running;
  }

  async function poll() {
    clearTimeout(timer);
    try { paint(await lyricsApi.finder.status()); } catch { return; }
    if (state.running && root.isConnected) timer = setTimeout(poll, 1500);
  }

  button.addEventListener('click', async () => {
    try { paint(await (state?.running ? lyricsApi.finder.cancel() : lyricsApi.finder.start())); } catch (err) { toastError(err); return; }
    poll();
  });
  poll();
  return root;
}
