export function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0; let n = bytes;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i += 1; }
  const digits = n >= 100 || i === 0 ? 0 : 1;
  return `${n.toLocaleString('es-ES', { minimumFractionDigits: digits, maximumFractionDigits: digits })} ${units[i]}`;
}

export const formatDate = (ms) =>
  new Date(ms).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });

export function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '0:00';
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const pad = (v) => String(v).padStart(2, '0');
  return h ? `${h}:${pad(m % 60)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}

export const stripExtension = (name) => name.replace(/\.[^./]{1,5}$/, '');
