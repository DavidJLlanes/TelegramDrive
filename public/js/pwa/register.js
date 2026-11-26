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

let hasInteracted = false;
addEventListener('pointerdown', () => { hasInteracted = true; }, { once: true, capture: true });

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.register('sw.js', { scope: './' });
    // Cada versión nueva se descarga en segundo plano y se activa sola. Si llega justo al abrir la app (aún no se ha usado),
    // se recarga al momento con un fundido; si la app ya se está usando (p. ej. con música), solo se avisa.
    const hadController = Boolean(navigator.serviceWorker.controller); // en la primera visita no hay nada que actualizar
    let reloaded = false;
    const reload = () => { if (reloaded) return; reloaded = true; document.documentElement.classList.add('app-leaving'); setTimeout(() => location.reload(), 160); };
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || reloaded) return;
      const fresh = performance.now() < 8000 && !hasInteracted && !document.body.classList.contains('audio-live');
      if (fresh) reload();
      else toast('Hay una nueva versión disponible', { action: { label: 'Actualizar', run: reload } });
    });
    reg.update().catch(() => {});
    // Al volver a la app desde segundo plano (en iPhone no siempre se reinicia), se comprueba si hay versión nueva
    document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
  } catch (err) { console.warn('Service worker no registrado', err); }
}
