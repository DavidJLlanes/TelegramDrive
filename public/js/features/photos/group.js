// Agrupa las fotos por mes (sin DOM). `takenAt` viene en ms; las fechas EXIF no llevan zona horaria y se tratan como UTC.
const monthFormat = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' });

export function groupByMonth(photos) {
  const groups = [];
  for (const photo of photos) {
    const d = new Date(photo.takenAt);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const last = groups[groups.length - 1];
    if (last?.key === key) last.items.push(photo);
    else groups.push({ key, label: monthFormat.format(d), items: [photo] });
  }
  return groups;
}

/** Enlace a OpenStreetMap con la ubicación de la foto (sin cargar mapas dentro de la aplicación). */
export const mapUrl = (lat, lon) => `https://www.openstreetmap.org/?mlat=${lat.toFixed(5)}&mlon=${lon.toFixed(5)}#map=15/${lat.toFixed(5)}/${lon.toFixed(5)}`;
