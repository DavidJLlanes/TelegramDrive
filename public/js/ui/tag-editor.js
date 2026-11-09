// Corrección de etiquetas de música desde la app. Se guarda en Telegram (pie del mensaje); el archivo no se modifica.
import { api } from '../core/api.js';
import { reload, watchSync } from '../core/drive.js';
import { navigateLib } from '../core/router.js';
import { formDialog } from './form-dialog.js';
import { toast, toastError } from './toast.js';

const TRACK_FIELDS = [
  ['title', 'Título'], ['artist', 'Artista'], ['album', 'Álbum'], ['genre', 'Género'],
  ['track', 'Nº de pista', 'number'], ['disc', 'Disco', 'number'], ['year', 'Año', 'number'],
];

const changed = (values, current) => Object.fromEntries(Object.entries(values).filter(([k, v]) => v !== String(current[k] || '')));

export async function editTrackTags(file) {
  const t = file.tags ?? {};
  const values = await formDialog({
    title: 'Etiquetas de la canción',
    fields: TRACK_FIELDS.map(([name, label, type]) => ({ name, label, type, value: t[name] || '' })),
  });
  if (!values) return;
  const patch = changed(values, t);
  if (!Object.keys(patch).length) return;
  try { await api.setTags(file.id, patch); toast('Etiquetas actualizadas', { type: 'ok' }); reload(); } catch (err) { toastError(err); }
}

async function runRetag(filter, set, after) {
  if (!Object.keys(set).length) return;
  try {
    await api.retag(filter, set);
    toast('Actualizando etiquetas… puedes seguir usando la aplicación.');
    watchSync().then(after);
  } catch (err) { toastError(err.status === 409 ? new Error('Ya hay un cambio de etiquetas en curso') : err); }
}

/** Edita álbum, artista, género y año de todas las canciones de un álbum. */
export async function editAlbumTags({ artist, album, tracks }) {
  const first = tracks[0]?.tags ?? {};
  const values = await formDialog({
    title: 'Editar álbum',
    fields: [
      { name: 'album', label: 'Álbum', value: album },
      { name: 'band', label: 'Artista del álbum', value: artist },
      { name: 'genre', label: 'Género', value: first.genre || '' },
      { name: 'year', label: 'Año', type: 'number', value: first.year || '' },
    ],
  });
  if (!values) return;
  const set = changed(values, { album, band: artist, genre: first.genre, year: first.year });
  // al renombrar el álbum o el artista, la vista actual dejaría de existir: se abre la nueva cuando termina el cambio
  const moved = set.album !== undefined || set.band !== undefined;
  await runRetag({ artist, album }, set, moved ? () => navigateLib('album', set.band || artist, set.album ?? album) : undefined);
}

/** Renombra un artista en todas sus canciones. Si el nombre ya existe, ambos se fusionan. */
export async function editArtistName(name) {
  const values = await formDialog({
    title: 'Renombrar o fusionar artista',
    fields: [{ name: 'band', label: 'Nombre del artista', value: name, placeholder: 'Si ya existe, se fusionan' }],
    confirmLabel: 'Aplicar',
  });
  if (values?.band && values.band !== name) await runRetag({ artist: name }, { band: values.band }, () => navigateLib('artist', values.band));
}

const BULK_FIELDS = [['artist', 'Artista'], ['band', 'Artista del álbum'], ['album', 'Álbum'], ['genre', 'Género'], ['year', 'Año', 'number']];
const MIXED = 'Varios valores: déjalo vacío para no cambiarlo';

/**
 * Edita las etiquetas de varias canciones a la vez: archivos elegidos con el check y/o carpetas (con sus subcarpetas).
 * Cada campo muestra el valor común; si difieren queda vacío y no se toca. Vaciar un campo con valor común lo borra.
 */
export async function editTagsBulk({ files = [], folders = [] }) {
  const found = files.filter((f) => f.kind === 'audio');
  try { for (const path of folders) found.push(...(await api.queue(path, true)).files); } catch (err) { toastError(err); return; }
  const tracks = [...new Map(found.map((t) => [t.id, t])).values()];
  if (!tracks.length) { toast('No hay música en la selección'); return; }
  if (tracks.length > 5000) { toast('Selecciona como máximo 5.000 canciones a la vez'); return; }

  const initial = {};
  const mixed = new Set();
  for (const [key] of BULK_FIELDS) {
    const values = new Set(tracks.map((t) => String(t.tags?.[key] || '')));
    if (values.size === 1) initial[key] = [...values][0]; else { initial[key] = ''; mixed.add(key); }
  }
  const values = await formDialog({
    title: `Editar etiquetas de ${tracks.length.toLocaleString('es-ES')} ${tracks.length === 1 ? 'canción' : 'canciones'}`,
    confirmLabel: 'Aplicar',
    fields: BULK_FIELDS.map(([name, label, type]) => ({ name, label, type, value: initial[name], placeholder: mixed.has(name) ? MIXED : '' })),
  });
  if (!values) return;
  const set = Object.fromEntries(BULK_FIELDS.map(([k]) => k).filter((k) => values[k] !== initial[k]).map((k) => [k, values[k]]));
  if (!Object.keys(set).length) return;
  try {
    await api.retagIds(tracks.map((t) => t.id), set);
    toast('Actualizando etiquetas… puedes seguir usando la aplicación.');
    watchSync();
  } catch (err) { toastError(err.status === 409 ? new Error('Ya hay un cambio de etiquetas en curso') : err); }
}
