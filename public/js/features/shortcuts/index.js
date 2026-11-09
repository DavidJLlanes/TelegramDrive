// Atajos de teclado globales. Otras funciones pueden añadir los suyos con `bindShortcut`.
import { appState } from '../../core/store.js';
import { navigate, navigateTrash } from '../../core/router.js';
import { visibleFiles } from '../../core/drive.js';
import { audioControls } from '../../players/audio-player.js';
import { createFolder } from '../../ui/actions.js';
import { pickFiles } from '../uploads/index.js';
import { createKeymap } from './keymap.js';
import { showHelp } from './help.js';

const keymap = createKeymap();
export const bindShortcut = (binding) => keymap.bind(binding);

const typing = (t) => t instanceof Element && (t.matches('input, textarea, select, [contenteditable="true"]') || t.closest('[contenteditable="true"]'));
const blocked = () => Boolean(document.querySelector('.overlay, .lightbox, .menu'));
const onFiles = () => appState.get().section === 'files';
const audio = () => audioControls.active();

const nav = 'Navegación';
bindShortcut({ keys: '/', label: 'Buscar', group: nav, run: (e) => { e.preventDefault(); document.querySelector('.search input')?.focus(); } });
bindShortcut({ keys: 'g h', label: 'Ir a Inicio', group: nav, run: () => navigate('/') });
bindShortcut({ keys: 'g t', label: 'Ir a la papelera', group: nav, run: () => navigateTrash() });
bindShortcut({ keys: '?', label: 'Mostrar esta ayuda', group: nav, run: () => showHelp(keymap) });

const files = 'Archivos';
bindShortcut({ keys: 'u', label: 'Subir archivos', group: files, when: onFiles, run: () => pickFiles() });
bindShortcut({ keys: 'n', label: 'Nueva carpeta', group: files, when: onFiles, run: () => createFolder() });
bindShortcut({ keys: 'ctrl+a', label: 'Seleccionar todo lo visible', group: files, when: onFiles, run: (e) => {
  e.preventDefault();
  const s = appState.get();
  appState.set({ selected: [...(s.results ? [] : s.folders.map((f) => `d:${f.path}`)), ...visibleFiles().map((f) => `f:${f.id}`)] });
} });

const music = 'Reproductor';
bindShortcut({ keys: 'space', label: 'Reproducir / pausar', group: music, when: audio, run: (e) => { e.preventDefault(); audioControls.toggle(); } });
bindShortcut({ keys: 'arrowright', label: 'Adelantar 10 s', group: music, when: audio, run: (e) => { e.preventDefault(); audioControls.seekBy(10); } });
bindShortcut({ keys: 'arrowleft', label: 'Retroceder 10 s', group: music, when: audio, run: (e) => { e.preventDefault(); audioControls.seekBy(-10); } });
bindShortcut({ keys: 'shift+arrowright', label: 'Siguiente canción', group: music, when: audio, run: (e) => { e.preventDefault(); audioControls.next(); } });
bindShortcut({ keys: 'shift+arrowleft', label: 'Canción anterior', group: music, when: audio, run: (e) => { e.preventDefault(); audioControls.prev(); } });
bindShortcut({ keys: 'arrowup', label: 'Subir volumen', group: music, when: audio, run: (e) => { e.preventDefault(); audioControls.volumeBy(0.05); } });
bindShortcut({ keys: 'arrowdown', label: 'Bajar volumen', group: music, when: audio, run: (e) => { e.preventDefault(); audioControls.volumeBy(-0.05); } });
bindShortcut({ keys: 'm', label: 'Silenciar', group: music, when: audio, run: () => audioControls.mute() });

document.addEventListener('keydown', (e) => {
  if (e.defaultPrevented || e.isComposing || typing(e.target) || blocked()) return;
  if (e.altKey || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() !== 'a')) return;
  if (e.target instanceof Element && e.target.closest('button, a, [role="slider"]') && (e.key === ' ' || e.key.startsWith('Arrow'))) return;
  keymap.handle(e);
});
