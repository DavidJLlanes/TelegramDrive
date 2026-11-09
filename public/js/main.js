import { api, onUnauthorized } from './core/api.js';
import { appState } from './core/store.js';
import { loadPath, watchSync } from './core/drive.js';
import { loadLibrary } from './core/library.js';
import { loadTrash } from './core/trash.js';
import { loadPage } from './core/page.js';
import { runAppStart } from './core/hooks.js';
import './features/index.js';
import { resumeSession } from './players/session.js';
import { onRoute, currentRoute } from './core/router.js';
import { renderLogin } from './ui/login.js';
import { offlineTracks, removeOffline } from './core/offline.js';
import { clearResume } from './players/resume.js';
import { renderShell } from './ui/app-shell.js';
import { renderOfflineHome } from './ui/offline-home.js';
import { enableDropZone } from './features/uploads/index.js';
import { registerServiceWorker } from './pwa/register.js';

const root = document.getElementById('app');
let started = false;

function showLogin() {
  appState.set({ loading: true });
  renderLogin(root, start);
}

async function logout({ wipe = false } = {}) {
  await api.logout().catch(() => {});
  if (wipe) {
    await removeOffline(offlineTracks().map((t) => t.id)).catch(() => {});
    clearResume();
  }
  location.reload();
}

const openRoute = (route) => {
  if (route.kind === 'lib') return loadLibrary(route);
  if (route.kind === 'trash') return loadTrash();
  if (route.kind === 'page') return loadPage(route.id, route.parts);
  return loadPath(route.path);
};

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
  runAppStart();
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
