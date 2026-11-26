// Estilo de carpeta: color (tono + tonalidad, ver parseColor; -1 = automático) e icono de una lista cerrada ('' = carpeta normal).
export const FOLDER_ICONS = Object.freeze([
  'music', 'video', 'image', 'file', 'archive', 'cloud', 'disc', 'plane',
  'star', 'heart', 'book', 'code', 'game', 'briefcase', 'home', 'user',
  'camera', 'mic', 'headphones', 'film', 'palette', 'gift', 'cart', 'euro',
  'receipt', 'calendar', 'pin', 'globe', 'lock', 'key', 'shield', 'mail',
  'phone', 'bulb', 'rocket', 'flag', 'bookmark', 'tool', 'paw', 'leaf',
  'coffee', 'car', 'cap', 'dumbbell', 'chart', 'none', // 'none' = carpeta sin icono
  'sun', 'moon', 'tree', 'mountain', 'umbrella', 'bike', 'ball', 'trophy',
  'smile', 'users', 'building', 'health', 'pill', 'food', 'wine', 'cake',
  'guitar', 'piano', 'tv', 'laptop', 'database', 'terminal', 'inbox', 'clip',
  'box', 'map', 'train', 'anchor', 'sprout', 'fire', 'bolt', 'snow',
  'crown', 'gem', 'puzzle', 'fish', 'ticket', 'scissors', 'pen', 'bank',
  'idcard', 'target', 'hourglass',
]);

// Color = tono (0-359) + 360 × tonalidad (0 normal, 1 intenso, 2 suave, 3 neutro). Los colores antiguos (0-359) siguen valiendo igual.
export const COLOR_TONES = 4;
export const COLOR_MAX = 360 * COLOR_TONES;
export const isColor = (c) => Number.isInteger(c) && c >= 0 && c < COLOR_MAX;

export function parseColor(raw) {
  if (raw === null || raw === '' || raw === -1) return -1;
  const color = Number(raw);
  return isColor(color) ? color : undefined;
}

export const parseIcon = (raw) => (raw === null || raw === '' ? '' : FOLDER_ICONS.includes(raw) ? raw : undefined);
