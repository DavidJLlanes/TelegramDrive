// Estilo de carpeta: color (tono + tonalidad: normal, intenso, suave o neutro; el tema fija la luminosidad) e icono de una lista cerrada.
// Se usa para una carpeta (color e icono juntos) y para varias a la vez (solo color o solo icono).
import { h, fill } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { dialog } from './modal.js';
import '../core/icons-folder.js';
import { FOLDER_COLORS, FOLDER_ICONS, COLOR_TONES, NEUTRALS, colorValue, decodeColor, paintColor } from './folder-styles-data.js';

export { FOLDER_COLORS, FOLDER_ICONS };

const TABS = [...COLOR_TONES, { id: 3, name: 'Neutros' }];

function radios(label, cls) {
  const box = h('div', { class: cls, role: 'radiogroup', 'aria-label': label });
  return box;
}
const mark = (box, value) => box.querySelectorAll('[role=radio]').forEach((el) => el.setAttribute('aria-checked', String(el.dataset.value === String(value))));

/** Selector de color: pestañas de tonalidad + rejilla de tonos. `get()` = valor elegido (-1 automático). */
export function colorPicker(initial = -1) {
  let value = initial;
  let tone = decodeColor(initial)?.tone ?? 0;
  const tabs = h('div', { class: 'tone-tabs', role: 'tablist', 'aria-label': 'Tonalidad' });
  const grid = radios('Color de la carpeta', 'swatches');
  const swatch = (v, label) => {
    const el = h('button', { type: 'button', role: 'radio', class: `swatch${v === -1 ? ' auto' : ''}`, title: label, 'aria-label': label, dataset: { value: v } });
    paintColor(el, v); // la CSP no admite el atributo style: solo la API CSSOM
    el.addEventListener('click', () => { value = v; mark(grid, value); });
    return el;
  };
  const paint = () => {
    const list = tone === 3 ? NEUTRALS : FOLDER_COLORS;
    fill(grid, swatch(-1, 'Automático'), ...list.map((c) => swatch(colorValue(c.hue, tone), tone === 3 || tone === 0 ? c.name : `${c.name} ${TABS[tone].name.toLowerCase()}`)));
    mark(grid, value);
    tabs.querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', String(Number(b.dataset.tone) === tone)));
  };
  TABS.forEach((t) => tabs.append(h('button', { type: 'button', role: 'tab', dataset: { tone: t.id }, onclick: () => { tone = t.id; paint(); } }, t.name)));
  paint();
  return { el: h('div', { class: 'color-picker' }, tabs, grid), get: () => value };
}

/** Selector de icono. `get()` = icono elegido ('' carpeta normal, 'none' sin icono). */
export function iconPicker(initial = '') {
  let value = initial;
  const grid = radios('Icono de la carpeta', 'folder-icons');
  for (const [v, label] of FOLDER_ICONS) {
    const el = h('button', { type: 'button', role: 'radio', class: 'icon-choice', title: label, 'aria-label': label, dataset: { value: v } }, icon(v === 'none' ? 'ban' : v || 'folder'));
    el.addEventListener('click', () => { value = v; mark(grid, value); });
    grid.append(el);
  }
  mark(grid, value);
  return { el: grid, get: () => value };
}

/** Devuelve { color, icon } (color -1 = automático, icon '' = carpeta) o null si se cancela. */
export function pickFolderStyle(folder) {
  const colors = colorPicker(Number.isInteger(folder.color) ? folder.color : -1);
  const icons = iconPicker(folder.icon || '');
  const content = h('div', { class: 'style-picker' }, h('div', { class: 'picker-label' }, 'Color'), colors.el, h('div', { class: 'picker-label' }, 'Icono'), icons.el);
  return dialog({ title: `Personalizar «${folder.name}»`, content, confirmLabel: 'Guardar', onConfirm: () => ({ color: colors.get(), icon: icons.get() }) });
}

const many = (n) => `${n} ${n === 1 ? 'carpeta' : 'carpetas'}`;
/** Color para varias carpetas: el valor elegido, o null si se cancela. */
export function pickColorFor(folders) {
  const first = folders[0]?.color;
  const colors = colorPicker(folders.every((f) => f.color === first) && Number.isInteger(first) ? first : -1);
  return dialog({ title: `Color de ${many(folders.length)}`, content: h('div', { class: 'style-picker' }, colors.el), confirmLabel: 'Aplicar', onConfirm: () => colors.get() });
}
/** Icono para varias carpetas: el valor elegido, o null si se cancela. */
export function pickIconFor(folders) {
  const icons = iconPicker('');
  return dialog({ title: `Icono de ${many(folders.length)}`, content: h('div', { class: 'style-picker' }, icons.el), confirmLabel: 'Aplicar', onConfirm: () => icons.get() });
}
