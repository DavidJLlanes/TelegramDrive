import { toast } from '../ui/toast.js';

let deferredPrompt = null;
const listeners = new Set();

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  listeners.forEach((fn) => fn(true));
});
window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  listeners.forEach((fn) => fn(false));
});

export const onInstallAvailable = (fn) => { listeners.add(fn); fn(Boolean(deferredPrompt)); };
export const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

export async function promptInstall() {
  if (!deferredPrompt) {
    toast('En iPhone/iPad: Compartir → "Añadir a pantalla de inicio". En escritorio, usa el icono de instalar de la barra de direcciones.');
    return;
  }
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  listeners.forEach((fn) => fn(false));
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.register('sw.js', { scope: './' });
    // La versión nueva se activa sola (sw.js) y los archivos se piden siempre a la red: al volver a abrir la app ya es la nueva.
    // A la página abierta solo se le avisa (recargar sola cortaría la música, también con la pantalla bloqueada).
    const hadController = Boolean(navigator.serviceWorker.controller); // en la primera visita no hay nada que actualizar
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || reloaded) return;
      toast('Hay una nueva versión disponible', { action: { label: 'Actualizar', run: () => { reloaded = true; location.reload(); } } });
    });
    reg.update().catch(() => {});
  } catch (err) { console.warn('Service worker no registrado', err); }
}
