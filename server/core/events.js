// Bus de eventos interno: desacopla quien produce un hecho (login, subida…) de quien reacciona (registro de accesos, avisos…).
// Eventos usados: 'auth:login' { ok, ip, ua } · 'share:access' { token, ok, ip, ua } · 'catalog:changed'.
import { EventEmitter } from 'node:events';

export const events = new EventEmitter();
events.setMaxListeners(50);

/** Emite sin que un oyente defectuoso pueda romper la petición que produjo el evento. */
export function emitSafe(name, payload) {
  for (const listener of events.listeners(name)) {
    try { listener(payload); } catch (err) { console.warn(`[events] ${name}:`, err.message); }
  }
}
