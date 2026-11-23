import { HttpError } from '../utils/errors.js';

export const notFoundHandler = (_req, _res, next) => next(new HttpError(404, 'No encontrado'));

export function errorHandler(err, req, res, _next) {
  const status = err.status || (err.errorMessage?.startsWith('FLOOD') ? 429 : 500);
  if (status >= 500 && !err.expose) console.error(`[error] ${req.method} ${req.originalUrl}:`, err);
  if (res.headersSent) return res.destroy();
  const message = status >= 500 && !err.expose ? 'Error interno del servidor' : err.message; // `expose`: fallo esperado de un servicio externo, con mensaje pensado para el usuario
  return res.status(status).json(err.code && status < 500 ? { error: message, code: err.code } : { error: message });
}
