import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { api } from '../core/api.js';
import { menuViews, navigateView } from '../core/views.js';
import { watchSync } from '../core/drive.js';
import { onInstallAvailable, promptInstall, isStandalone } from '../pwa/register.js';
import { pickFiles } from '../features/uploads/index.js';
import { openMenu } from './menu.js';
import { pop } from './pop.js';
import { toast, toastError } from './toast.js';
import { offlineTracks } from '../core/offline.js';
import { manageShares } from './share-dialog.js';

export function renderTopbar({ onLogout }) {
  let canInstall = false;
  onInstallAvailable((available) => { canInstall = available && !isStandalone(); });

  const sync = async () => {
    try { await api.refresh(); toast('Sincronizando con Telegram…'); watchSync(); } catch (e) { toastError(e); }
  };
  const overflow = (e) => openMenu(e.currentTarget, [
    { label: 'Sincronizar con Telegram', icon: 'refresh', run: sync },
    { label: 'Subir carpeta', icon: 'folderPlus', run: () => pickFiles({ directory: true }) },
    { label: 'Enlaces compartidos', icon: 'link', run: manageShares },
    ...(canInstall ? [{ label: 'Instalar aplicación', icon: 'install', run: promptInstall }] : []),
    'sep',
    ...menuViews('more').map((v) => ({ label: v.label, icon: v.icon, run: () => navigateView(v.id) })), // configuración y demás ajustes
    'sep',
    { label: 'Cerrar sesión', icon: 'logout', run: () => onLogout() },
    ...(offlineTracks().length ? [{ label: 'Cerrar sesión y borrar música guardada', icon: 'trash', danger: true, run: () => onLogout({ wipe: true }) }] : []),
  ]);

  return h('header', { class: 'topbar' },
    h('span', { class: 'brand-mark' }, h('img', { src: 'icons/icon-96.png', alt: '', width: 40, height: 40 })),
    h('div', { class: 'toolbar-spacer' }),
    h('button', { class: 'btn btn-icon btn-ghost pop-fx', 'aria-label': 'Más opciones', 'aria-haspopup': 'menu', onclick: (e) => { const b = e.currentTarget; pop(b); overflow({ currentTarget: b }); } }, icon('more')));
}
