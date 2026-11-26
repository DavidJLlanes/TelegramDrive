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
import './pwa/no-zoom.js';
import './pwa/global-errors.js';

const root = document.getElementById('app');
let started = false;
let shellShown = false;
// Pista local de «hay sesión»: permite pintar la app al instante al abrirla, sin esperar a que el servidor lo confirme.
// No da acceso a nada (los datos los pide la API con la cookie); si la sesión caducó, la API responde 401 y sale el acceso.
const AUTH_HINT = 'tgdrive-authed';
const hint = (on) => { try { if (on) localStorage.setItem(AUTH_HINT, '1'); else localStorage.removeItem(AUTH_HINT); } catch { /* modo privado */ } };
const hinted = () => { try { return localStorage.getItem(AUTH_HINT) === '1'; } catch { return false; } };

function showLogin() {
  hint(false); shellShown = false;
  appState.set({ loading: true });
  renderLogin(root, start);
}

async function logout({ wipe = false } = {}) {
  hint(false);
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
  hint(true);
  if (shellShown) return; // ya se pintó al abrir (arranque optimista)
  shellShown = true;
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
  if (hinted() && navigator.onLine) start(); // la app aparece al momento; la comprobación de sesión sigue debajo
  try {
    const status = await api.status();
    if (status.authenticated) start(); else showLogin();
  } catch {
    if (!shellShown) renderOfflineHome(root, () => location.reload());
  }
}

const setOffline = () => appState.set({ offline: !navigator.onLine });
window.addEventListener('online', setOffline);
window.addEventListener('offline', setOffline);
setOffline();
boot();
