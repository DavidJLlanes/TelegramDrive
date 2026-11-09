import { h } from '../../core/dom.js';
import { http } from '../../core/api.js';
import { formatBytes } from '../../core/format.js';
import { dialog } from '../../ui/modal.js';

const dirOf = (rel) => rel.split('/').slice(0, -1).join('/');

/** Pregunta al servidor qué entradas ya existen en el destino. Si falla, se sube todo (la comprobación es opcional). */
export async function findDuplicates(base, entries) {
  try {
    const items = entries.map(({ file, rel }) => ({ dir: dirOf(rel), name: file.name, size: file.size }));
    return await http.post('files/check', { parent: base, items });
  } catch { return { same: [], differs: [] }; }
}

/**
 * Devuelve las entradas a subir según la elección: omitir las idénticas, subir todo (el servidor renombra) o cancelar (null).
 */
export async function resolveDuplicates(base, entries) {
  const { same, differs } = await findDuplicates(base, entries);
  if (!same.length && !differs.length) return entries;
  const sameSet = new Set(same);
  const names = (list) => list.slice(0, 4).map((i) => entries[i].file.name).join(', ') + (list.length > 4 ? `… (+${list.length - 4})` : '');
  const lines = [];
  if (same.length) lines.push(h('p', {}, h('strong', {}, `${same.length} ya ${same.length === 1 ? 'está' : 'están'} en la carpeta`), ` con el mismo tamaño: ${names(same)}`));
  if (differs.length) lines.push(h('p', {}, h('strong', {}, `${differs.length} ${differs.length === 1 ? 'tiene' : 'tienen'} el nombre de otro archivo`), ` (se guardarían como «nombre (1)»): ${names(differs)}`));
  const total = same.reduce((n, i) => n + entries[i].file.size, 0);
  const choice = await dialog({
    title: 'Archivos repetidos',
    content: h('div', { class: 'dup-info' }, lines, same.length ? h('p', { class: 'muted' }, `Omitirlos ahorra ${formatBytes(total)}.`) : null),
    confirmLabel: same.length ? 'Omitir repetidos' : 'Subir igualmente',
    onConfirm: () => (same.length ? 'skip' : 'all'),
  });
  if (!choice) return null;
  return choice === 'skip' ? entries.filter((_, i) => !sameSet.has(i)) : entries;
}
