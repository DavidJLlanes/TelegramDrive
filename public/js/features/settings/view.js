// Sección «Configuración»: ajustes de la aplicación que se guardan en este dispositivo.
import { h, fill } from '../../core/dom.js';
import { look } from '../now-playing/settings.js';
import { createScopeSettings } from '../scope/settings-panel.js';
import { createBulkControl } from '../lyrics/bulk-control.js';

function toggleRow(key, title, hint) {
  const input = h('input', { class: 'switch', type: 'checkbox', role: 'switch', 'aria-label': title, onchange: (e) => look.set(key, e.target.checked) });
  input.checked = Boolean(look.get(key));
  return h('label', { class: 'pg-row set-row' }, h('div', { class: 'pg-main' }, h('strong', {}, title), h('span', {}, hint)), input);
}

export function renderSettings(el) {
  fill(el,
    h('section', { class: 'pg-panel' }, h('h2', {}, 'Reproductor'),
      h('p', { class: 'pg-hint' }, 'Aspecto de la barra y de la pantalla completa.'),
      h('div', { class: 'pg-rows' },
        toggleRow('tint', 'Colores de la carátula', 'El fondo y los botones de la pantalla completa toman el color de cada disco.'),
        toggleRow('disc', 'Carátula como disco giratorio', 'Gira mientras suena la música.'),
        toggleRow('wave', 'Forma de onda en la barra de posición', 'Descarga la canción una segunda vez (hasta 14 MB) para dibujarla; se guarda en el dispositivo.'))),
    h('section', { class: 'pg-panel' }, h('h2', {}, 'Letras'),
      h('p', { class: 'pg-hint' }, 'Las letras se buscan en LRCLIB (lrclib.net), una base de datos abierta. Desde tu servidor solo se le envían el título, el artista, el álbum y la duración de la canción.'),
      h('div', { class: 'pg-rows' }, toggleRow('lyricsAuto', 'Buscar la letra al reproducir', 'Si una canción no tiene letra, se busca sola al empezar a sonar. Solo se guarda una coincidencia segura.')),
      createBulkControl()),
    h('section', { class: 'pg-panel' }, h('h2', {}, 'Osciloscopio'),
      h('p', { class: 'pg-hint' }, 'Se ve bajo la carátula en la pantalla completa (también se activa desde el botón de arriba a la derecha). En iPhone y iPad puede cortar el sonido con la pantalla bloqueada, por eso pide confirmación al activarlo.'),
      h('div', { class: 'pg-rows' }, toggleRow('scopeOn', 'Mostrar el osciloscopio', 'En la pantalla completa del reproductor.')),
      createScopeSettings()));
}
