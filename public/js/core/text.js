const collator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });
export const compareNames = (a, b) => collator.compare(a, b);
