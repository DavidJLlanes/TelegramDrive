// Estilo de carpeta: color (paleta de tonos; el tema fija luminosidad y croma) e icono de una lista cerrada.
import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { dialog } from './modal.js';

export const FOLDER_COLORS = [
  { name: 'Rojo', hue: 25 }, { name: 'Naranja', hue: 55 }, { name: 'Amarillo', hue: 95 }, { name: 'Lima', hue: 130 },
  { name: 'Verde', hue: 160 }, { name: 'Turquesa', hue: 195 }, { name: 'Azul', hue: 245 }, { name: 'Violeta', hue: 285 },
  { name: 'Magenta', hue: 325 }, { name: 'Rosa', hue: 355 },
];

// Debe coincidir con server/utils/folder-style.js (el servidor rechaza cualquier otro nombre).
export const FOLDER_ICONS = [
  ['', 'Carpeta'], ['music', 'Música'], ['video', 'Vídeo'], ['image', 'Fotos'], ['file', 'Documentos'], ['archive', 'Archivo'],
  ['cloud', 'Nube'], ['disc', 'Discos'], ['plane', 'Viajes'], ['star', 'Favoritos'], ['heart', 'Me gusta'], ['book', 'Libros'],
  ['code', 'Código'], ['game', 'Juegos'], ['briefcase', 'Trabajo'], ['home', 'Casa'], ['user', 'Personal'],
];

function group(label, role) {
  const items = [];
  const mark = (value) => items.forEach((it) => it.el.setAttribute('aria-checked', String(it.value === value)));
  const add = (el, value, onPick) => { el.setAttribute('role', 'radio'); el.addEventListener('click', () => { onPick(value); mark(value); }); items.push({ el, value }); return el; };
  return { mark, add, wrap: (...kids) => h('div', { class: role, role: 'radiogroup', 'aria-label': label }, ...kids) };
}

/** Devuelve { color, icon } (color -1 = automático, icon '' = carpeta) o null si se cancela. */
export function pickFolderStyle(folder) {
  const state = { color: Number.isInteger(folder.color) ? folder.color : -1, icon: folder.icon || '' };
  const colors = group('Color de la carpeta', 'swatches');
  const icons = group('Icono de la carpeta', 'folder-icons');
  const swatch = (hue, label) => {
    const el = h('button', { type: 'button', class: `swatch${hue === -1 ? ' auto' : ''}`, title: label, 'aria-label': label });
    if (hue !== -1) el.style.setProperty('--h', hue); // la CSP no admite el atributo style: solo la API CSSOM
    return colors.add(el, hue, (v) => { state.color = v; });
  };
  const pick = (value, label) => icons.add(h('button', { type: 'button', class: 'icon-choice', title: label, 'aria-label': label }, icon(value || 'folder')), value, (v) => { state.icon = v; });
  const content = h('div', { class: 'style-picker' },
    h('div', { class: 'picker-label' }, 'Color'),
    colors.wrap(swatch(-1, 'Automático'), ...FOLDER_COLORS.map((c) => swatch(c.hue, c.name))),
    h('div', { class: 'picker-label' }, 'Icono'),
    icons.wrap(...FOLDER_ICONS.map(([value, label]) => pick(value, label))));
  colors.mark(state.color); icons.mark(state.icon);
  return dialog({ title: `Personalizar «${folder.name}»`, content, confirmLabel: 'Guardar', onConfirm: () => ({ ...state }) });
}
