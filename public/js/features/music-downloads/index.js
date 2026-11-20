import { registerView } from '../../core/views.js';
import { musicApi } from './api.js';
import { renderDownloads } from './view.js';

registerView({
  id: 'descargas', label: 'Descargas', icon: 'download', group: 'more',
  title: () => 'Descargas de música',
  sub: () => 'MP3 desde YouTube, organizados automáticamente en TelegramDrive',
  load: musicApi.status,
  render: renderDownloads,
});
