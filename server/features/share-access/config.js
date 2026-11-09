export const shareAccessConfig = Object.freeze({
  passwordMin: 4,
  passwordMax: 128,
  maxDownloadsLimit: 100_000,
  unlockTtlMs: 60 * 60_000,   // una contraseña correcta vale una hora en ese navegador
});
