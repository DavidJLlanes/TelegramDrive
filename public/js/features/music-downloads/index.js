import { registerView } from '../../core/views.js';
import { musicApi } from './api.js';
import { renderDownloads } from './view.js';

registerView({
  id: 'descargas', label: 'Descargas', icon: 'download', group: 'more',
  title: () => 'Descargas de música',
  sub: () => 'Audio MP3 y vídeos MP4 de YouTube, en carpetas independientes',
  load: musicApi.status,
  render: renderDownloads,
});
