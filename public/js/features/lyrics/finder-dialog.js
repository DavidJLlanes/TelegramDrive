// Diálogo «Buscar letra en internet»: candidatos de LRCLIB para elegir (con vista previa), búsqueda afinable a mano.
import { h, fill } from '../../core/dom.js';
import { dialog } from '../../ui/modal.js';
import { toastError } from '../../ui/toast.js';
import { formatTime } from '../../core/format.js';
import { trackTitle } from '../../core/tags.js';
import { lyricsApi } from './api.js';

const note = (text) => h('p', { class: 'lf-note' }, text);

/** → la letra guardada o null si se cancela. */
export function openLyricsFinder(file) {
  const list = h('div', { class: 'lf-list', role: 'radiogroup', 'aria-label': 'Letras encontradas' });
  const query = h('input', { class: 'input', type: 'search', placeholder: 'Título y artista', 'aria-label': 'Buscar', autocomplete: 'off', maxlength: 200 });
  let chosen = null; let token = 0;

  function row(c, first) {
    const radio = h('input', { type: 'radio', name: 'lf', value: c.id, onchange: () => { chosen = c.id; } });
    if (first && c.confident) { radio.checked = true; chosen = c.id; }
    const meta = [c.artist, c.album, c.duration ? formatTime(c.duration) : ''].filter(Boolean).join(' · ');
    return h('label', { class: 'lf-row' }, radio,
      h('span', { class: 'lf-main' }, h('strong', {}, c.title || 'Sin título'), h('span', { class: 'lf-meta' }, meta), c.preview ? h('em', { class: 'lf-preview' }, c.preview) : null),
      c.synced ? h('span', { class: 'lf-badge' }, 'Sincronizada') : null);
  }

  async function search(text = '') {
    const mine = ++token; chosen = null;
    fill(list, note('Buscando en LRCLIB…'));
    try {
      const r = await lyricsApi.search(file.id, text);
      if (mine !== token) return;
      const usable = r.candidates.filter((c) => !c.instrumental);
      if (!text && !query.value) query.value = [r.query.title, r.query.artist].filter(Boolean).join(' ');
      fill(list, usable.length ? usable.map((c, i) => row(c, i === 0))
        : note(r.candidates.length ? 'Esta pista figura como instrumental en LRCLIB.' : 'No hay resultados. Prueba a cambiar el texto de arriba (por ejemplo, solo el título).'));
    } catch (err) { if (mine === token) fill(list, note(err.message)); }
  }

  const go = h('button', { class: 'btn', type: 'button', onclick: () => search(query.value.trim()) }, 'Buscar');
  query.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); search(query.value.trim()); } });

  const done = dialog({
    title: 'Buscar letra en internet', confirmLabel: 'Usar esta letra',
    content: h('div', { class: 'lf' }, h('p', {}, `Para «${trackTitle(file)}». Solo se envían título, artista, álbum y duración.`),
      h('div', { class: 'lf-search' }, query, go), list),
    onConfirm: async () => {
      if (!chosen) return undefined; // no cierra: falta elegir
      try { return await lyricsApi.adopt(file.id, chosen); } catch (err) { toastError(err); return undefined; }
    },
  });
  search();
  return done;
}
