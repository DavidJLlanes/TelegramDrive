export const shareAccessConfig = Object.freeze({
  passwordMin: 4,
  passwordMax: 128,
  maxDownloadsLimit: 100_000,
  unlockTtlMs: 60 * 60_000,   // una contraseña correcta vale una hora en ese navegador
  grantTtlMs: 6 * 60 * 60_000, // tras una descarga contada, sus trozos Range valen 6 horas en ese navegador
});
