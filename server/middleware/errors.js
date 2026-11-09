import { HttpError } from '../utils/errors.js';

export const notFoundHandler = (_req, _res, next) => next(new HttpError(404, 'No encontrado'));

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  const status = err.status || (err.errorMessage?.startsWith('FLOOD') ? 429 : 500);
  if (status >= 500) console.error(`[error] ${req.method} ${req.originalUrl}:`, err);
  if (res.headersSent) return res.destroy();
  const message = status >= 500 ? 'Error interno del servidor' : err.message;
  return res.status(status).json({ error: message });
}
