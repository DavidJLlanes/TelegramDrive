// Red de seguridad: un fallo asíncrono sin capturar ya no se queda mudo; se avisa con un mensaje (máx. uno cada 4 s).
import { toastError } from '../ui/toast.js';

let last = 0;
window.addEventListener('unhandledrejection', (event) => {
  const err = event.reason;
  if (err?.name === 'AbortError') return; // cancelaciones normales (cerrar un reproductor, cambiar de pantalla)
  console.error(err);
  if (Date.now() - last < 4000) return;
  last = Date.now();
  toastError(err instanceof Error ? err : new Error(String(err ?? 'Error desconocido')));
});
