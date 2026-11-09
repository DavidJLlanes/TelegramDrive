// Recibe los archivos compartidos desde otras aplicaciones (Android): pregunta la carpeta y los sube.
import { onAppStart } from '../../core/hooks.js';
import { toast } from '../../ui/toast.js';
import { pickFolder } from '../../ui/modal.js';
import { uploadTo } from '../uploads/index.js';
import { takeShared } from './store.js';

onAppStart(async () => {
  const params = new URLSearchParams(location.search);
  if (!params.has('shared')) return;
  history.replaceState(null, '', location.pathname + location.hash); // que recargar no repita el reparto
  const files = await takeShared();
  if (!files.length) { toast('No se recibió ningún archivo para subir'); return; }
  const target = await pickFolder({ title: `Subir ${files.length} ${files.length === 1 ? 'archivo' : 'archivos'} a…` });
  if (target === null) { toast('Subida cancelada'); return; }
  uploadTo(files.map((file) => ({ file, rel: '' })), target);
});
