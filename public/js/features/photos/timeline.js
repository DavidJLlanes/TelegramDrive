import { h, fill } from '../../core/dom.js';
import { toastError } from '../../ui/toast.js';
import { photosApi } from './api.js';
import { photoGrid } from './grid.js';

const PAGE = 200;

export const loadTimeline = () => photosApi.timeline(0, PAGE);

/** Línea de tiempo: de la más reciente a la más antigua por fecha de la toma (EXIF) o, si no hay, de subida. */
export function renderTimeline(el, { data }) {
  const photos = [...data.photos];
  let total = data.total;
  const paint = () => {
    const more = photos.length < total ? h('button', { class: 'btn ph-more', type: 'button', onclick: async (e) => {
      e.currentTarget.disabled = true;
      try { const next = await photosApi.timeline(photos.length, PAGE); photos.push(...next.photos); total = next.total; } catch (err) { toastError(err); }
      paint();
    } }, `Cargar más (${photos.length} de ${total})`) : null;
    fill(el, ...(photos.length ? photoGrid(photos) : [h('div', { class: 'empty' }, h('strong', {}, 'Aún no hay fotos'), h('span', {}, 'Sube imágenes a cualquier carpeta y aparecerán aquí ordenadas por la fecha en que se hicieron.'))]), more);
  };
  paint();
}

export const timelineSub = ({ data }) => (data ? `${data.total.toLocaleString('es-ES')} ${data.total === 1 ? 'foto' : 'fotos'}` : '');
