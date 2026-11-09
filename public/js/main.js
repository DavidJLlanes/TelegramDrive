import { api, onUnauthorized } from './core/api.js';
import { appState } from './core/store.js';
import { loadPath, watchSync } from './core/drive.js';
import { loadLibrary } from './core/library.js';
import { loadTrash } from './core/trash.js';
import { resumeSession } from './players/session.js';
import { onRoute, currentRoute } from './core/router.js';
import { renderLogin } from './ui/login.js';
import { renderShell } from './ui/app-shell.js';
import { renderOfflineHome } from './ui/offline-home.js';
import { enableDropZone } from './ui/uploader.js';
import { registerServiceWorker } from './pwa/register.js';

const root = document.getElementById('app');
let started = false;

function showLogin() {
  appState.set({ loading: true });
  renderLogin(root, start);
}

async function logout() {
  await api.logout().catch(() => {});
  location.reload();
}

const openRoute = (route) => (route.kind === 'lib' ? loadLibrary(route) : route.kind === 'trash' ? loadTrash() : loadPath(route.path));

function start() {
  renderShell(root, { onLogout: logout });
  if (!started) {
    started = true;
    enableDropZone();
    onRoute(openRoute);
  }
  openRoute(currentRoute());
  watchSync();
  resumeSession();
}

async function boot() {
  registerServiceWorker();
  onUnauthorized(showLogin);
  try {
    const status = await api.status();
    if (status.authenticated) start(); else showLogin();
  } catch {
    renderOfflineHome(root, () => location.reload());
  }
}

const setOffline = () => appState.set({ offline: !navigator.onLine });
window.addEventListener('online', setOffline);
window.addEventListener('offline', setOffline);
setOffline();
boot();
