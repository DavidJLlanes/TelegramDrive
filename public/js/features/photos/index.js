// Fotos: línea de tiempo por fecha EXIF (con enlace al mapa) y álbumes de fotos.
import { registerView } from '../../core/views.js';
import { addFileMenuItems } from '../../core/explorer-ext.js';
import { loadTimeline, renderTimeline, timelineSub } from './timeline.js';
import { loadAlbums, renderAlbums, albumTools } from './albums.js';
import { albumMenuItem } from './album-picker.js';

registerView({
  id: 'fotos', label: 'Fotos', icon: 'camera', group: 'library',
  title: () => 'Fotos', sub: timelineSub, load: loadTimeline, render: renderTimeline,
});

registerView({
  id: 'albumes-fotos', label: 'Álbumes de fotos', icon: 'image', group: 'library',
  title: (page) => page.data?.open?.album.name ?? 'Álbumes de fotos',
  sub: (page) => (page.data?.open ? `${page.data.open.photos.length} fotos` : 'Agrupa tus fotos sin moverlas de carpeta'),
  tools: albumTools, load: loadAlbums, render: renderAlbums,
});

addFileMenuItems((file) => (file.kind === 'image' ? [albumMenuItem(file)] : []));
