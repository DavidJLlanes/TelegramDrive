// Letras: botón en el reproductor y panel con la letra de la canción actual (editable, o importada de las etiquetas).
import { h } from '../../core/dom.js';
import { icon } from '../../core/icons.js';
import { appState, watch } from '../../core/store.js';
import { onAudioReady } from '../../players/audio-hooks.js';
import { queueTracks } from '../../players/audio-player.js';
import { createLyricsPanel } from './panel.js';
import { ensureLyrics } from './auto.js';
import { look } from '../now-playing/settings.js';

const current = () => queueTracks().find((f) => f.id === appState.get().playingId) ?? null;
const panel = createLyricsPanel(current);

onAudioReady((_audio, bar) => {
  const button = h('button', { class: 'btn btn-icon', type: 'button', 'aria-label': 'Letra', title: 'Letra', onclick: panel.toggle }, icon('lyrics'));
  bar.querySelector('.audio-volume')?.prepend(button);
  let lastId = null;
  watch(appState, bar, () => {
    const file = current();
    panel.follow(file);
    // Al empezar una canción nueva se busca su letra sin esperar a que se abra la pantalla completa (se puede desactivar en Configuración).
    if (file && file.id !== lastId) { lastId = file.id; if (look.get('lyricsAuto')) ensureLyrics(file); }
  });
});
