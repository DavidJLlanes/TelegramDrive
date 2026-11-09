import fs from 'node:fs';
import path from 'node:path';
import { badRequest } from '../../utils/errors.js';
import { encrypt } from './cipher.js';
import { pack } from './container.js';
import { readSources, snapshotDatabase } from './snapshot.js';

const stamp = (ts) => new Date(ts).toISOString().replace(/[-:]/g, '').replace(/\..*/, '').replace('T', '-');

/**
 * Copias de seguridad cifradas de lo que NO se puede reconstruir desde Telegram (enlaces, letras, registro de accesos,
 * ajustes de .env…). Se envían a un chat aparte y se conservan las últimas `keep`.
 */
export function createService({ db, tg, settings, tmpDir, sources, now = Date.now }) {
  let running = false;
  const state = { lastRun: 0, lastOk: 0, lastError: '', lastSize: 0 };
  const stateKey = 'backup_state';
  try { Object.assign(state, JSON.parse(db.meta.get(stateKey) ?? '{}')); } catch { /* sin estado previo */ }
  const save = () => db.meta.set(stateKey, JSON.stringify(state));

  const ready = () => {
    if (!settings.passphrase) throw badRequest('Falta BACKUP_PASSPHRASE en el .env');
    if (settings.passphrase.length < settings.minPassphrase) throw badRequest(`BACKUP_PASSPHRASE debe tener al menos ${settings.minPassphrase} caracteres`);
  };

  function build() {
    ready();
    const files = [{ name: 'index.db', data: snapshotDatabase(db, tmpDir) }, ...readSources(sources())];
    return { name: `tgdrive-backup-${stamp(now())}.tgb`, data: encrypt(pack(files, { app: 'telegram-drive', createdAt: now() }), settings.passphrase) };
  }

  async function prune(view) {
    const found = [];
    for await (const m of view.iterTagged({ tag: settings.tag })) found.push(m.id);
    const stale = found.sort((a, b) => b - a).slice(settings.keep);
    if (stale.length) await view.remove(stale);
    return stale.length;
  }

  return {
    async run() {
      if (running) throw badRequest('Ya hay una copia en curso');
      running = true;
      state.lastRun = now();
      let tmp;
      try {
        const { name, data } = build();
        const view = await tg.forChat(settings.chat, 'BACKUP_CHAT');
        tmp = path.join(tmpDir, name);
        fs.writeFileSync(tmp, data, { mode: 0o600 });
        await view.sendFile({ path: tmp, name, size: data.length, caption: `${settings.tag} ${JSON.stringify({ v: 1, ts: now(), size: data.length })}` });
        const removed = await prune(view);
        Object.assign(state, { lastOk: now(), lastError: '', lastSize: data.length });
        return { name, size: data.length, removed };
      } catch (err) {
        state.lastError = err.message;
        throw err;
      } finally {
        running = false;
        if (tmp) fs.rmSync(tmp, { force: true });
        save();
      }
    },
    status: () => ({
      enabled: settings.enabled, configured: settings.passphrase.length >= settings.minPassphrase, chat: settings.chat,
      everyHours: settings.everyHours, keep: settings.keep, includesSession: settings.includeSession, running, ...state,
    }),
    build, // expuesto para pruebas
  };
}
