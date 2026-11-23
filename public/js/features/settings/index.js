// Configuración de la aplicación (se registra como una vista más del menú «Más»).
import { registerView } from '../../core/views.js';
import { renderSettings } from './view.js';

registerView({
  id: 'ajustes', label: 'Configuración', icon: 'sliders', group: 'more',
  title: () => 'Configuración', sub: () => 'Ajustes de la aplicación en este dispositivo',
  render: renderSettings,
});
