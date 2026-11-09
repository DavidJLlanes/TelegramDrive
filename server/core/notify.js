// Aviso opcional al propietario por webhook (compatible con ntfy.sh y servicios similares: cuerpo de texto + cabecera Title).
import { config } from '../config/index.js';

/** Envía `text`; nunca lanza: un webhook caído no debe afectar a quien avisa. */
export function notify(text, { webhook = config.health.webhook, title = 'Telegram Drive' } = {}) {
  if (!webhook) return Promise.resolve(false);
  return fetch(webhook, {
    method: 'POST', headers: { 'Content-Type': 'text/plain; charset=utf-8', Title: title }, body: text, signal: AbortSignal.timeout(10_000),
  }).then(() => true).catch((err) => { console.warn('[aviso] el webhook falló:', err.message); return false; });
}
