// Forma de onda en la barra del reproductor.
import { appState, watch } from '../../core/store.js';
import { onAudioReady } from '../../players/audio-hooks.js';
import { followPeaks } from './follow.js';
import { attachWave } from './seek.js';

onAudioReady((audio, bar) => {
  const range = bar.querySelector('.audio-seek .range');
  if (!range) return;
  const follower = followPeaks(attachWave(range, audio, { height: 30 }));
  watch(appState, bar, follower.refresh);
});
