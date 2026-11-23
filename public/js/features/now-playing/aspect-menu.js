// Menú «Aspecto» de la pantalla completa: ajustes visuales del reproductor.
import { openMenu } from '../../ui/menu.js';
import { navigateView } from '../../core/views.js';
import { look } from './settings.js';

const yesNo = (value) => (value ? 'sí' : 'no');

export function openAspectMenu(anchor, { stop, leave } = {}) {
  openMenu(anchor, [
    { label: `Carátula como disco giratorio: ${yesNo(look.get('disc'))}`, icon: 'disc', run: () => look.toggle('disc') },
    { label: `Colores de la carátula: ${yesNo(look.get('tint'))}`, icon: 'palette', run: () => look.toggle('tint') },
    { label: `Onda en la barra de posición: ${yesNo(look.get('wave'))}`, icon: 'play', run: () => look.toggle('wave') },
    ...(leave ? ['sep', { label: 'Más ajustes…', icon: 'sliders', run: () => { leave(); navigateView('ajustes'); } }] : []),
    ...(stop ? [{ label: 'Cerrar el reproductor', icon: 'close', run: stop }] : []),
  ]);
}
