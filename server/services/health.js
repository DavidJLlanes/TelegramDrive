import { config } from '../config/index.js';

const INTERVAL = 60_000;

/** Vigila la conexión con Telegram; avisa (log + webhook opcional) al caerse y al recuperarse. */
export class Health {
  constructor({ tg, webhook = config.health.webhook }) {
    Object.assign(this, { tg, webhook });
    this.state = { ok: true, since: Date.now(), reason: '' };
    this.timer = null;
  }

  start() {
    this.timer = setInterval(() => this.check(), INTERVAL);
    this.timer.unref();
  }

  async check() {
    let ok = true;
    let reason = '';
    try {
      await this.tg.ping();
    } catch (err) {
      ok = false;
      reason = /AUTH_KEY|SESSION_REVOKED|SESSION_EXPIRED|USER_DEACTIVATED/.test(err?.errorMessage || err?.message || '')
        ? 'La sesión de Telegram ha caducado. Ejecuta "npm run login" en el servidor.'
        : 'No hay conexión con Telegram.';
    }
    if (ok !== this.state.ok) {
      this.state = { ok, since: Date.now(), reason };
      console[ok ? 'log' : 'error'](`[salud] ${ok ? 'Telegram vuelve a responder' : reason}`);
      this.#notify(ok ? 'Telegram Drive: Telegram vuelve a responder.' : `Telegram Drive: ${reason}`);
    } else if (!ok) this.state.reason = reason;
    return this.state;
  }

  #notify(text) {
    if (!this.webhook) return;
    fetch(this.webhook, { method: 'POST', headers: { 'Content-Type': 'text/plain; charset=utf-8', Title: 'Telegram Drive' }, body: text })
      .catch((err) => console.warn('[salud] el webhook falló:', err.message));
  }
}
