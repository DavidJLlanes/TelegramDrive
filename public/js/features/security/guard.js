import { navigateView } from '../../core/views.js';
import { toast } from '../../ui/toast.js';
import { securityApi } from './api.js';

/** Al abrir la aplicación, avisa si ha entrado un dispositivo que no se había confirmado. */
export async function warnAboutNewDevices() {
  const { newDevices } = await securityApi.summary();
  if (!newDevices.length) return;
  const names = newDevices.map((d) => d.label).join(', ');
  toast(`Nuevo dispositivo con acceso: ${names}`, { type: 'error', action: { label: 'Revisar', run: () => navigateView('seguridad') }, timeout: 15000 });
}
