// Enlaces temporales: cualquiera con el enlace puede ver o descargar SOLO ese archivo (o el ZIP de esa carpeta) hasta que caduque.
import { h } from '../core/dom.js';
import { api, shareUrl } from '../core/api.js';
import { icon } from '../core/icons.js';
import { dialog } from './modal.js';
import { toast, toastError } from './toast.js';
import { policyFields, policyLabel } from '../features/share-policy/fields.js';
import { policyApi } from '../features/share-policy/api.js';

const DURATIONS = [['1h', '1 hora'], ['1d', '1 día'], ['7d', '7 días'], ['30d', '30 días']];
const when = (ms) => new Date(ms).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast('Enlace copiado', { type: 'ok' }); } catch { toast('Copia el enlace manualmente'); }
}

function linkBox(share) {
  const url = shareUrl(share.token);
  const input = h('input', { class: 'input', type: 'text', value: url, readonly: '', 'aria-label': 'Enlace', onfocus: (e) => e.target.select() });
  return h('div', { class: 'share-link' }, input,
    h('button', { type: 'button', class: 'btn btn-icon', 'aria-label': 'Copiar enlace', onclick: () => copy(url) }, icon('copy')));
}

/** target: id (archivo) o ruta (carpeta). */
export async function shareItem({ kind, target, label }) {
  const select = h('select', { class: 'input', 'aria-label': 'Caduca en' }, DURATIONS.map(([v, text]) => h('option', { value: v, selected: v === '7d' ? '' : null }, text)));
  const policy = policyFields();
  const ok = await dialog({
    title: 'Compartir enlace', confirmLabel: 'Crear enlace',
    content: h('div', { class: 'fields' },
      h('p', {}, kind === 'folder' ? `Se compartirá «${label}» como un ZIP.` : `Se compartirá «${label}».`),
      h('label', { class: 'field' }, h('span', {}, 'Caduca en'), select), policy.el),
    onConfirm: () => ({ duration: select.value, policy: policy.read() }),
  });
  if (!ok) return;
  try {
    const share = await api.createShare({ kind, target: String(target), duration: ok.duration });
    if (ok.policy) await policyApi.set(share.token, ok.policy);
    await dialog({
      title: 'Enlace listo', hideCancel: true, confirmLabel: 'Hecho',
      content: h('div', { class: 'fields' }, linkBox(share), h('p', {}, `Caduca el ${when(share.exp)}. Puedes anularlo antes desde «Enlaces compartidos».`)),
    });
  } catch (err) { toastError(err); }
}

export async function manageShares() {
  let shares = [];
  let policies = {};
  try { [{ shares }, policies] = await Promise.all([api.shares(), policyApi.list().catch(() => ({}))]); } catch (err) { toastError(err); return; }
  const list = h('div', { class: 'shares' });
  const paint = () => {
    list.replaceChildren(...(shares.length ? shares.map((s) => h('div', { class: 'share-row' },
      h('div', { class: 'share-info' }, h('strong', {}, s.label), h('span', {}, [`Caduca ${when(s.exp)}`, policyLabel(policies[s.token])].filter(Boolean).join(' · '))),
      h('button', { type: 'button', class: 'btn btn-icon', 'aria-label': 'Copiar enlace', onclick: () => copy(shareUrl(s.token)) }, icon('copy')),
      h('button', { type: 'button', class: 'btn btn-icon', 'aria-label': 'Anular enlace', onclick: async () => {
        try { await api.revokeShare(s.token); shares = shares.filter((x) => x !== s); paint(); } catch (err) { toastError(err); }
      } }, icon('trash')))) : [h('p', {}, 'No hay enlaces activos.')]));
  };
  paint();
  await dialog({ title: 'Enlaces compartidos', content: list, hideCancel: true, confirmLabel: 'Cerrar' });
}
