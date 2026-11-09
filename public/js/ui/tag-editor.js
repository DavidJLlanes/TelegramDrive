// Corrección de etiquetas de música desde la app. Se guarda en Telegram (pie del mensaje); el archivo no se modifica.
import { api } from '../core/api.js';
import { reload, watchSync } from '../core/drive.js';
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

async function runRetag(filter, set) {
  if (!Object.keys(set).length) return;
  try {
    await api.retag(filter, set);
    toast('Actualizando etiquetas… puedes seguir usando la aplicación.');
    watchSync();
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
  await runRetag({ artist, album }, set);
}

/** Renombra un artista en todas sus canciones. Si el nombre ya existe, ambos se fusionan. */
export async function editArtistName(name) {
  const values = await formDialog({
    title: 'Renombrar o fusionar artista',
    fields: [{ name: 'band', label: 'Nombre del artista', value: name, placeholder: 'Si ya existe, se fusionan' }],
    confirmLabel: 'Aplicar',
  });
  if (values?.band && values.band !== name) await runRetag({ artist: name }, { band: values.band });
}
