import { h, fill } from '../../core/dom.js';
import { icon } from '../../core/icons.js';
import { trackTitle } from '../../core/tags.js';
import { toast, toastError } from '../../ui/toast.js';
import { lyricsApi } from './api.js';

/** Panel de letras de la canción que suena. `current()` devuelve el archivo actual o null. */
export function createLyricsPanel(current) {
  let root = null;
  let shownId = null;
  let editing = false;

  const close = () => { root?.remove(); root = null; shownId = null; };

  async function load(file) {
    shownId = file.id; editing = false;
    fill(root.querySelector('.ly-body'), h('p', { class: 'ly-empty' }, 'Cargando…'));
    try { paint(file, await lyricsApi.get(file.id)); } catch (err) { toastError(err); }
  }

  async function run(file, action, okText) {
    try { const lyrics = await action(); if (okText) toast(okText, { type: 'ok' }); editing = false; paint(file, lyrics); } catch (err) { toastError(err); }
  }

  function paint(file, lyrics) {
    if (!root || shownId !== file.id) return;
    const body = root.querySelector('.ly-body');
    const actions = root.querySelector('.ly-actions');
    if (editing) {
      const area = h('textarea', { class: 'input ly-edit', rows: 14, 'aria-label': 'Letra', maxlength: 20000 });
      area.value = lyrics?.text ?? '';
      fill(body, area);
      fill(actions, h('button', { class: 'btn', type: 'button', onclick: () => { editing = false; paint(file, lyrics); } }, 'Cancelar'),
        h('button', { class: 'btn btn-primary', type: 'button', onclick: () => run(file, () => lyricsApi.save(file.id, area.value), 'Letra guardada') }, 'Guardar'));
      area.focus();
      return;
    }
    fill(body, lyrics ? h('div', { class: 'ly-text' }, lyrics.text) : h('p', { class: 'ly-empty' }, 'Todavía no hay letra para esta canción. Puedes escribirla, pegarla o importarla de las etiquetas del archivo.'));
    fill(actions,
      h('button', { class: 'btn', type: 'button', onclick: () => run(file, () => lyricsApi.importFromFile(file.id), 'Letra importada del archivo') }, 'Importar del archivo'),
      lyrics ? h('button', { class: 'btn btn-danger', type: 'button', onclick: () => run(file, async () => { await lyricsApi.remove(file.id); return null; }, 'Letra quitada') }, 'Quitar') : null,
      h('button', { class: 'btn btn-primary', type: 'button', onclick: () => { editing = true; paint(file, lyrics); } }, lyrics ? 'Editar' : 'Escribir letra'));
  }

  return {
    toggle() {
      if (root) { close(); return; }
      const file = current();
      if (!file) return;
      root = h('aside', { class: 'ly-panel', 'aria-label': 'Letra' },
        h('div', { class: 'ly-head' }, h('strong', { class: 'ly-title' }, trackTitle(file)),
          h('button', { class: 'btn btn-icon btn-ghost', type: 'button', 'aria-label': 'Cerrar letra', onclick: close }, icon('close'))),
        h('div', { class: 'ly-body' }), h('div', { class: 'ly-actions' }));
      document.body.append(root);
      load(file);
    },
    /** Al cambiar de canción, el panel abierto la sigue. */
    follow(file) {
      if (!root || !file || file.id === shownId) return;
      root.querySelector('.ly-title').textContent = trackTitle(file);
      load(file);
    },
  };
}
