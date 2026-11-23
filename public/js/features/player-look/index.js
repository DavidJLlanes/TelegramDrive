// Detalles visuales de la barra del reproductor: estado «sonando» (disco giratorio), progreso fino para la barra compacta
// del móvil y la animación de la carátula al cambiar de canción.
import { appState, watch } from '../../core/store.js';
import { onAudioReady } from '../../players/audio-hooks.js';
import { look } from '../now-playing/settings.js';

onAudioReady((audio, bar) => {
  const art = bar.querySelector('.audio-art');
  const syncPlaying = () => bar.classList.toggle('is-playing', !audio.paused);
  for (const event of ['play', 'pause', 'ended']) audio.addEventListener(event, syncPlaying);
  audio.addEventListener('timeupdate', () => bar.style.setProperty('--p', `${audio.duration ? ((audio.currentTime / audio.duration) * 100).toFixed(1) : 0}%`));
  bar.classList.toggle('disc', look.get('disc'));
  look.onChange((key, value) => { if (key === 'disc') bar.classList.toggle('disc', value); });
  let last = null;
  watch(appState, bar, (s) => {
    if (s.playingId === last) return;
    last = s.playingId;
    art.classList.remove('swap'); void art.offsetWidth; art.classList.add('swap');
  });
  syncPlaying();
});
