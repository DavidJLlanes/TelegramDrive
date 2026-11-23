// Color de carpeta: paleta de tonos (el tema fija luminosidad y croma) más «Automático» (según el nombre).
import { h } from '../core/dom.js';
import { dialog } from './modal.js';

export const FOLDER_COLORS = [
  { name: 'Rojo', hue: 25 }, { name: 'Naranja', hue: 55 }, { name: 'Amarillo', hue: 95 }, { name: 'Lima', hue: 130 },
  { name: 'Verde', hue: 160 }, { name: 'Turquesa', hue: 195 }, { name: 'Azul', hue: 245 }, { name: 'Violeta', hue: 285 },
  { name: 'Magenta', hue: 325 }, { name: 'Rosa', hue: 355 },
];

/** Devuelve el tono elegido, -1 para automático, o null si se cancela. */
export function pickFolderColor(folder) {
  let chosen = Number.isInteger(folder.color) ? folder.color : -1;
  const swatches = [];
  const mark = () => swatches.forEach(({ button, hue }) => button.setAttribute('aria-checked', String(hue === chosen)));
  const swatch = (hue, label) => {
    const button = h('button', {
      type: 'button', role: 'radio', class: `swatch${hue === -1 ? ' auto' : ' hued'}`, title: label, 'aria-label': label,
      style: hue === -1 ? '' : `--h: ${hue}`,
      onclick: () => { chosen = hue; mark(); },
    });
    swatches.push({ button, hue });
    return button;
  };
  const content = h('div', { class: 'swatches', role: 'radiogroup', 'aria-label': 'Color de la carpeta' },
    swatch(-1, 'Automático'), ...FOLDER_COLORS.map((c) => swatch(c.hue, c.name)));
  mark();
  return dialog({ title: `Color de «${folder.name}»`, content, confirmLabel: 'Guardar', onConfirm: () => chosen });
}
