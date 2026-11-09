import { h } from '../../core/dom.js';

/** Campos opcionales del diálogo de compartir: contraseña y límite de descargas. `read()` → valores o null si no se pidió nada. */
export function policyFields() {
  const password = h('input', { class: 'input', type: 'password', autocomplete: 'new-password', placeholder: 'Sin contraseña', maxlength: 128, 'aria-label': 'Contraseña' });
  const limit = h('input', { class: 'input', type: 'number', min: 0, max: 100000, inputmode: 'numeric', placeholder: 'Sin límite', 'aria-label': 'Límite de descargas' });
  const el = h('div', { class: 'fields' },
    h('label', { class: 'field' }, h('span', {}, 'Contraseña (opcional)'), password),
    h('label', { class: 'field' }, h('span', {}, 'Máximo de descargas (opcional)'), limit));
  const read = () => {
    const pw = password.value;
    const max = limit.value === '' ? 0 : Number(limit.value);
    return pw || max ? { password: pw, maxDownloads: max } : null;
  };
  return { el, read };
}

/** Etiqueta corta del estado de un enlace: «con contraseña · 2/5 descargas». */
export function policyLabel(p) {
  if (!p) return '';
  const parts = [];
  if (p.protected) parts.push('con contraseña');
  if (p.maxDownloads) parts.push(`${p.downloads}/${p.maxDownloads} descargas`);
  return parts.join(' · ');
}
