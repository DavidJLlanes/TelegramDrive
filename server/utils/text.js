/** Clave de búsqueda: minúsculas y sin acentos ("Canción" -> "cancion"). */
export const searchKey = (text) =>
  String(text).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const collator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });
export const compareNames = (a, b) => collator.compare(a, b);
