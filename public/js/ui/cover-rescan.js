// «Releer carátulas»: vuelve a leer las etiquetas y busca fuera las carátulas que falten (la biblioteca o una carpeta).
import { http } from '../core/api.js';
import { reload } from '../core/drive.js';
import { confirmDialog } from './modal.js';
import { toast, toastError } from './toast.js';

const POLL_MS = 3000;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function rescanCovers(folder = '/') {
  const ok = await confirmDialog({
    title: 'Releer carátulas',
    message: 'Se volverán a leer las etiquetas de las canciones y se buscarán en internet las carátulas que falten. Puede tardar unos minutos y sigue en segundo plano.',
    confirmLabel: 'Empezar', danger: false,
  });
  if (!ok) return;
  try {
    await http.post('covers/rescan', { folder });
    toast('Releyendo carátulas en segundo plano…', { timeout: 6000 });
    let state;
    do { await wait(POLL_MS); state = await http.get('covers/rescan'); } while (state.running);
    toast(state.error ? `Terminó con un aviso: ${state.error}` : `Carátulas actualizadas${state.found ? ` (${state.found} encontradas en internet)` : ''}`, { type: state.error ? 'error' : 'ok' });
    reload();
  } catch (err) { toastError(err); }
}
