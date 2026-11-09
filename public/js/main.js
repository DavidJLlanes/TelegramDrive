import { api, onUnauthorized } from './core/api.js';
import { appState } from './core/store.js';
import { loadPath, watchSync } from './core/drive.js';
import { loadLibrary } from './core/library.js';
import { onRoute, currentRoute } from './core/router.js';
import { renderLogin } from './ui/login.js';
import { renderShell } from './ui/app-shell.js';
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

const openRoute = (route) => (route.kind === 'lib' ? loadLibrary(route) : loadPath(route.path));

function start() {
  renderShell(root, { onLogout: logout });
  if (!started) {
    started = true;
    enableDropZone();
    onRoute(openRoute);
  }
  openRoute(currentRoute());
  watchSync();
}

async function boot() {
  registerServiceWorker();
  onUnauthorized(showLogin);
  try {
    const status = await api.status();
    if (status.authenticated) start(); else showLogin();
  } catch {
    root.textContent = 'No se puede conectar con el servidor.';
  }
}

boot();
