import { registerView } from '../../core/views.js';
import { musicApi } from './api.js';
import { renderDownloads } from './view.js';

registerView({
  id: 'descargas', label: 'Descargas', icon: 'download', group: 'more',
  title: () => 'Centro de descargas',
  sub: () => 'Audio y vídeo desde YouTube, Vimeo, Dailymotion y SoundCloud',
  load: musicApi.status,
  render: renderDownloads,
});
