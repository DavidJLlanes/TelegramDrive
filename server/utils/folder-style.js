// Estilo de carpeta: tono de color (0-359, -1 = automático) e icono de una lista cerrada ('' = carpeta normal).
export const FOLDER_ICONS = Object.freeze([
  'music', 'video', 'image', 'file', 'archive', 'cloud', 'disc', 'plane',
  'star', 'heart', 'book', 'code', 'game', 'briefcase', 'home', 'user',
  'camera', 'mic', 'headphones', 'film', 'palette', 'gift', 'cart', 'euro',
  'receipt', 'calendar', 'pin', 'globe', 'lock', 'key', 'shield', 'mail',
  'phone', 'bulb', 'rocket', 'flag', 'bookmark', 'tool', 'paw', 'leaf',
  'coffee', 'car', 'cap', 'dumbbell', 'chart',
]);

export function parseColor(raw) {
  if (raw === null || raw === '' || raw === -1) return -1;
  const color = Number(raw);
  return Number.isInteger(color) && color >= 0 && color < 360 ? color : undefined;
}

export const parseIcon = (raw) => (raw === null || raw === '' ? '' : FOLDER_ICONS.includes(raw) ? raw : undefined);
