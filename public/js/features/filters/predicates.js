// Filtros puros (sin DOM): reciben el archivo y el momento actual.
const DAY = 86400000;

export const KINDS = [['all', 'Todo'], ['image', 'Imágenes'], ['video', 'Vídeo'], ['audio', 'Audio'], ['file', 'Documentos']];
export const DATES = [['any', 'Cualquier fecha'], ['day', 'Último día'], ['week', 'Última semana'], ['month', 'Último mes'], ['year', 'Último año']];
export const SIZES = [['any', 'Cualquier tamaño'], ['small', 'Menos de 1 MB'], ['medium', '1 – 100 MB'], ['large', 'Más de 100 MB']];

const DATE_MS = { day: DAY, week: 7 * DAY, month: 30 * DAY, year: 365 * DAY };
const MB = 1048576;
const SIZE_RANGE = { small: [0, MB], medium: [MB, 100 * MB], large: [100 * MB, Infinity] };

export const DEFAULT_FILTERS = Object.freeze({ kind: 'all', date: 'any', size: 'any' });
export const isActive = (f) => f.kind !== 'all' || f.date !== 'any' || f.size !== 'any';

export function matches(file, f, now = Date.now()) {
  if (f.kind !== 'all' && file.kind !== f.kind) return false;
  if (f.date !== 'any' && now - file.date > DATE_MS[f.date]) return false;
  if (f.size !== 'any') {
    const [min, max] = SIZE_RANGE[f.size];
    if (file.size < min || file.size >= max) return false;
  }
  return true;
}

export const filterFiles = (files, f, now) => (isActive(f) ? files.filter((x) => matches(x, f, now)) : files);
