// Revisión de la biblioteca: álbumes incompletos, pistas repetidas y etiquetas incoherentes.
import { registerView } from '../../core/views.js';
import { loadAudit, renderAudit } from './view.js';

registerView({
  id: 'revision', label: 'Revisión', icon: 'checklist', group: 'library',
  title: () => 'Revisión de la biblioteca', sub: () => 'Álbumes incompletos y etiquetas que conviene corregir',
  load: loadAudit, render: renderAudit,
});
