// Menú de la pantalla completa: qué se ve, ecualizador y ajustes visuales del reproductor.
import { openMenu } from '../../ui/menu.js';
import { navigateView } from '../../core/views.js';
import { look } from './settings.js';
import { toggleSoundPanel } from '../audio-fx/index.js';

const yesNo = (value) => (value ? 'sí' : 'no');

export function openAspectMenu(anchor, { stop, leave } = {}) {
  const panel = look.get('panel');
  const show = (id, label, ic) => ({ label: `${panel === id ? '● ' : ''}${label}`, icon: ic, run: () => look.set('panel', id) });
  openMenu(anchor, [
    show('art', 'Ver la carátula', 'music'), show('lyrics', 'Ver la letra', 'lyrics'), show('queue', 'Ver la lista de reproducción', 'list'),
    'sep',
    { label: 'Ecualizador y fundido…', icon: 'sliders', run: toggleSoundPanel },
    'sep',
    { label: `Osciloscopio: ${yesNo(look.get('scopeOn'))}`, icon: 'sliders', run: () => look.toggle('scopeOn') },
    { label: `Carátula como disco giratorio: ${yesNo(look.get('disc'))}`, icon: 'disc', run: () => look.toggle('disc') },
    { label: `Colores de la carátula: ${yesNo(look.get('tint'))}`, icon: 'palette', run: () => look.toggle('tint') },
    { label: `Onda en la barra de posición: ${yesNo(look.get('wave'))}`, icon: 'play', run: () => look.toggle('wave') },
    ...(leave ? ['sep', { label: 'Más ajustes…', icon: 'sliders', run: () => { leave(); navigateView('ajustes'); } }] : []),
    ...(stop ? [{ label: 'Cerrar el reproductor', icon: 'close', run: stop }] : []),
  ]);
}
