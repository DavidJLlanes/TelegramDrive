import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupByMonth, mapUrl } from '../public/js/features/photos/group.js';

const at = (y, m, d) => Date.UTC(y, m - 1, d, 12);

test('agrupa por mes manteniendo el orden y etiqueta en español', () => {
  const groups = groupByMonth([{ id: 1, takenAt: at(2024, 8, 9) }, { id: 2, takenAt: at(2024, 8, 1) }, { id: 3, takenAt: at(2023, 12, 31) }]);
  assert.deepEqual(groups.map((g) => [g.key, g.items.map((i) => i.id)]), [['2024-08', [1, 2]], ['2023-12', [3]]]);
  assert.equal(groups[0].label, 'agosto de 2024');
});
test('los límites de mes no se desplazan por zona horaria', () => {
  const g = groupByMonth([{ id: 1, takenAt: Date.UTC(2024, 0, 1, 0, 0, 0) }, { id: 2, takenAt: Date.UTC(2023, 11, 31, 23, 59, 59) }]);
  assert.deepEqual(g.map((x) => x.key), ['2024-01', '2023-12']);
});
test('enlace de mapa con coordenadas negativas', () => {
  assert.equal(mapUrl(-33.8688, 151.2093), 'https://www.openstreetmap.org/?mlat=-33.86880&mlon=151.20930#map=15/-33.86880/151.20930');
});
