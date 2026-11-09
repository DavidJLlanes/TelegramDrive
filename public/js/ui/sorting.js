const collator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });

export function sortFiles(files, sort) {
  const list = [...files];
  if (sort === 'date') return list.sort((a, b) => b.date - a.date);
  if (sort === 'size') return list.sort((a, b) => b.size - a.size);
  return list.sort((a, b) => collator.compare(a.name, b.name));
}
export const sortFolders = (folders) => [...folders].sort((a, b) => collator.compare(a.name, b.name));
