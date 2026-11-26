// Red de seguridad del arranque (script clásico, se carga antes que la app). Si la aplicación no llega a pintarse —por ejemplo,
// porque el móvil se quedó con archivos de una versión anterior en la caché—, borra la caché de la app (no la música guardada),
// quita el service worker y recarga una vez. Si aun así no arranca, muestra un aviso con un botón para reintentar.
(() => {
  const KEY = 'tgdrive-boot-recover';
  const app = () => document.getElementById('app');
  const booted = () => Boolean(app()?.children.length) && !app().classList.contains('boot-fail-box');
  let done = false;

  async function recover() {
    if (done || booted()) return;
    done = true;
    if (sessionStorage.getItem(KEY)) { showHelp(); return; }
    sessionStorage.setItem(KEY, '1');
    try {
      const regs = (await navigator.serviceWorker?.getRegistrations()) ?? [];
      await Promise.all(regs.map((r) => r.unregister()));
      const keys = (await globalThis.caches?.keys()) ?? [];
      await Promise.all(keys.filter((k) => k.startsWith('tgdrive-shell-')).map((k) => caches.delete(k)));
    } finally { location.reload(); }
  }

  function showHelp() {
    const root = app();
    if (!root) return;
    const msg = document.createElement('p');
    msg.className = 'boot-fail';
    msg.textContent = 'La aplicación no ha podido arrancar. Comprueba la conexión y vuelve a intentarlo.';
    const btn = document.createElement('button');
    btn.className = 'btn btn-primary';
    btn.textContent = 'Reintentar';
    btn.addEventListener('click', () => { sessionStorage.removeItem(KEY); location.reload(); });
    root.replaceChildren(msg, btn);
    root.classList.add('boot-fail-box');
  }

  // Un error de carga de módulos antes de pintar nada = arranque roto: se actúa enseguida. Si no, se espera un margen generoso.
  addEventListener('error', () => setTimeout(() => { if (!booted()) recover(); }, 1500), true);
  addEventListener('unhandledrejection', () => setTimeout(() => { if (!booted()) recover(); }, 1500));
  setTimeout(() => { if (booted()) sessionStorage.removeItem(KEY); else recover(); }, 12000);
  addEventListener('load', () => setTimeout(() => { if (booted()) sessionStorage.removeItem(KEY); }, 3000));
})();
