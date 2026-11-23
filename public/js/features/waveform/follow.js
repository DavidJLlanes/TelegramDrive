// Mantiene una barra con forma de onda al día con la canción que suena (la onda se pide unos segundos después de empezar la canción
// para no competir con el streaming).
import { appState } from '../../core/store.js';
import { queueTracks } from '../../players/audio-player.js';
import { look } from '../now-playing/settings.js';
import { loadPeaks, savedPeaks, canWave } from './loader.js';

const DELAY = 2500;
const currentFile = () => queueTracks().find((f) => f.id === appState.get().playingId) ?? null;

/** Mantiene `wave` (de attachWave) al día con la canción que suena. Devuelve la función para pararlo. */
export function followPeaks(wave) {
  let timer = null; let controller = null; let shown = null;
  const refresh = () => {
    const file = currentFile();
    if (file?.id === shown && look.get('wave')) return;
    shown = look.get('wave') ? file?.id ?? null : null;
    clearTimeout(timer); controller?.abort(); controller = null;
    wave.set(null);
    if (!file || !look.get('wave') || !canWave(file)) return;
    const saved = savedPeaks(file.id);
    if (saved) { wave.set(saved); return; }
    timer = setTimeout(async () => {
      controller = new AbortController();
      const peaks = await loadPeaks(file, controller.signal);
      if (peaks && currentFile()?.id === file.id) wave.set(peaks);
    }, DELAY);
  };
  refresh();
  const stopLook = look.onChange((key) => { if (key === 'wave') { shown = undefined; refresh(); } });
  return { refresh, stop() { clearTimeout(timer); controller?.abort(); stopLook(); wave.destroy(); } };
}
