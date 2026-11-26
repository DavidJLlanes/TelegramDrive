// Catálogo de colores e iconos de carpeta (datos puros). Debe coincidir con server/utils/folder-style.js.
// Un color se guarda como tono (0-359) + 360 × tonalidad: 0 normal, 1 intenso, 2 suave, 3 neutro (gris con un matiz del tono).
export const FOLDER_COLORS = [
  { name: 'Rojo', hue: 25 }, { name: 'Coral', hue: 40 }, { name: 'Mandarina', hue: 50 },
  { name: 'Naranja', hue: 58 }, { name: 'Ámbar', hue: 78 }, { name: 'Mostaza', hue: 88 }, { name: 'Amarillo', hue: 98 },
  { name: 'Lima', hue: 120 }, { name: 'Pistacho', hue: 135 }, { name: 'Verde', hue: 150 }, { name: 'Esmeralda', hue: 165 },
  { name: 'Menta', hue: 180 }, { name: 'Turquesa', hue: 195 }, { name: 'Petróleo', hue: 205 }, { name: 'Cian', hue: 215 },
  { name: 'Cielo', hue: 235 }, { name: 'Azul', hue: 250 }, { name: 'Zafiro', hue: 260 }, { name: 'Índigo', hue: 268 },
  { name: 'Violeta', hue: 285 }, { name: 'Lavanda', hue: 295 }, { name: 'Púrpura', hue: 305 }, { name: 'Orquídea', hue: 315 },
  { name: 'Magenta', hue: 325 }, { name: 'Fucsia', hue: 340 }, { name: 'Frambuesa', hue: 348 }, { name: 'Rosa', hue: 355 },
];

export const COLOR_TONES = [
  { id: 0, name: 'Normal', k: 1 }, { id: 1, name: 'Intenso', k: 1.75 }, { id: 2, name: 'Suave', k: 0.5 },
];
/** Neutros (tonalidad 3): grises con un matiz. */
export const NEUTRALS = [
  { name: 'Grafito', hue: 250 }, { name: 'Acero', hue: 205 }, { name: 'Salvia', hue: 150 },
  { name: 'Arena', hue: 80 }, { name: 'Topo', hue: 40 }, { name: 'Malva', hue: 320 },
];
const CHROMA = [1, 1.75, 0.5, 0.14]; // factor de saturación de cada tonalidad (CSS: --k)

export const colorValue = (hue, tone = 0) => hue + 360 * tone;
/** { hue, tone, k } de un color guardado (o null si es automático). */
export function decodeColor(c) {
  if (!Number.isInteger(c) || c < 0) return null;
  const tone = Math.min(Math.floor(c / 360), 3);
  return { hue: c % 360, tone, k: CHROMA[tone] };
}
/** Pinta un elemento con un color de carpeta (variables CSS --h y --k). */
export function paintColor(el, c) {
  const d = decodeColor(c);
  if (!d) return false;
  el.style.setProperty('--h', d.hue); el.style.setProperty('--k', d.k);
  return true;
}

export const FOLDER_ICONS = [
  ['', 'Carpeta'], ['none', 'Sin icono'], ['music', 'Música'], ['video', 'Vídeo'], ['image', 'Fotos'], ['file', 'Documentos'], ['archive', 'Archivo'],
  ['cloud', 'Nube'], ['disc', 'Discos'], ['plane', 'Viajes'], ['star', 'Favoritos'], ['heart', 'Me gusta'], ['book', 'Libros'],
  ['code', 'Código'], ['game', 'Juegos'], ['briefcase', 'Trabajo'], ['home', 'Casa'], ['user', 'Personal'],
  ['camera', 'Cámara'], ['mic', 'Podcasts'], ['headphones', 'Audio'], ['film', 'Cine'], ['palette', 'Arte'], ['gift', 'Regalos'],
  ['cart', 'Compras'], ['euro', 'Finanzas'], ['receipt', 'Facturas'], ['calendar', 'Calendario'], ['pin', 'Lugares'], ['globe', 'Web'],
  ['lock', 'Privado'], ['key', 'Claves'], ['shield', 'Seguridad'], ['mail', 'Correo'], ['phone', 'Móvil'], ['bulb', 'Ideas'],
  ['rocket', 'Proyectos'], ['flag', 'Metas'], ['bookmark', 'Guardados'], ['tool', 'Herramientas'], ['paw', 'Mascotas'],
  ['leaf', 'Naturaleza'], ['coffee', 'Café'], ['car', 'Coche'], ['cap', 'Estudios'], ['dumbbell', 'Gimnasio'], ['chart', 'Informes'],
  ['sun', 'Verano'], ['moon', 'Noche'], ['tree', 'Bosque'], ['mountain', 'Montaña'], ['umbrella', 'Playa'], ['bike', 'Bici'],
  ['ball', 'Deporte'], ['trophy', 'Premios'], ['smile', 'Recuerdos'], ['users', 'Familia'], ['building', 'Empresa'], ['health', 'Salud'],
  ['pill', 'Medicinas'], ['food', 'Recetas'], ['wine', 'Bebidas'], ['cake', 'Cumpleaños'], ['guitar', 'Guitarra'], ['piano', 'Piano'],
  ['tv', 'Series'], ['laptop', 'Ordenador'], ['database', 'Copias'], ['terminal', 'Scripts'], ['inbox', 'Entrada'], ['clip', 'Adjuntos'],
  ['box', 'Paquetes'], ['map', 'Mapas'], ['train', 'Tren'], ['anchor', 'Mar'], ['sprout', 'Jardín'], ['fire', 'Top'],
  ['bolt', 'Energía'], ['snow', 'Invierno'], ['crown', 'Lo mejor'], ['gem', 'Joyas'], ['puzzle', 'Ocio'], ['fish', 'Pesca'],
  ['ticket', 'Entradas'], ['scissors', 'Manualidades'], ['pen', 'Escritura'], ['bank', 'Banco'], ['idcard', 'Identidad'], ['target', 'Objetivos'],
  ['hourglass', 'Pendiente'],
];
