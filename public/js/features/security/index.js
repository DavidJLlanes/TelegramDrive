import { registerView } from '../../core/views.js';
import { onAppStart } from '../../core/hooks.js';
import { loadSecurity, renderSecurity } from './view.js';
import { warnAboutNewDevices } from './guard.js';

registerView({
  id: 'seguridad', label: 'Seguridad', icon: 'shield', group: 'more',
  title: () => 'Seguridad', sub: () => 'Quién accede, avisos y copias de seguridad',
  load: loadSecurity, render: renderSecurity,
});
onAppStart(warnAboutNewDevices);
