// Lectura tipada de variables de entorno para la configuración propia de cada función (server/features/*/config.js).
const env = process.env;

export const text = (name, fallback = '') => (env[name] ?? fallback).trim();
export const number = (name, fallback) => { const n = Number(env[name]); return Number.isFinite(n) && env[name] !== undefined && env[name] !== '' ? n : fallback; };
export const flag = (name, fallback = false) => {
  const v = (env[name] ?? '').trim().toLowerCase();
  return v === '' ? fallback : ['1', 'true', 'yes', 'si', 'sí', 'on'].includes(v);
};
