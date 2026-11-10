// Aviso cuando la sincronización se negó a borrar del índice más de la mitad de los elementos (posible lectura incompleta de Telegram).
import { h, fill } from '../core/dom.js';
import { api } from '../core/api.js';
import { watchSync } from '../core/drive.js';
import { toast, toastError } from './toast.js';

export function showPruneGuard(el, { stale, known }) {
  const confirm = async () => {
    try { await api.refresh(true); toast('Sincronizando con Telegram…'); watchSync(); } catch (err) { toastError(err); }
  };
  fill(el, `La sincronización no encontró en Telegram ${stale} de ${known} elementos y, por seguridad, no los ha quitado de la lista. `,
    'Si los borraste tú, confírmalo; si no, no hagas nada y prueba a sincronizar más tarde. ',
    h('button', { class: 'btn btn-danger', type: 'button', onclick: confirm }, 'Quitarlos de la lista'));
}
