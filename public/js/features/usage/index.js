// Uso de espacio: por tipo, por carpeta y archivos más grandes.
import { registerView } from '../../core/views.js';
import { loadUsage, renderUsage } from './view.js';

registerView({
  id: 'espacio', label: 'Espacio', icon: 'chart', group: 'more',
  title: () => 'Uso de espacio', sub: () => 'Qué ocupa más en tu almacenamiento',
  load: loadUsage, render: renderUsage,
});
