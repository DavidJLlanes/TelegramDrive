import { hashPassword, verifyPassword, sign, safeEqual } from '../../utils/crypto.js';
import { badRequest, notFound, HttpError } from '../../utils/errors.js';

const isStart = (range) => !range || /^bytes=0-/.test(range); // una reproducción por Range pide muchos trozos: solo el primero cuenta

/** Reglas de acceso a enlaces compartidos: contraseña, límite de descargas y desbloqueo por cookie firmada. */
export function createService({ repo, shares, settings, secret, now = Date.now }) {
  const unlockValue = (token, exp) => `${exp}.${sign(`${token}.${exp}`, secret)}`;

  return {
    setPolicy(token, { password = '', maxDownloads = 0 } = {}) {
      if (!shares.resolve(token)) throw notFound('El enlace no existe o ha caducado');
      if (typeof password !== 'string' || (password && (password.length < settings.passwordMin || password.length > settings.passwordMax))) {
        throw badRequest(`La contraseña debe tener entre ${settings.passwordMin} y ${settings.passwordMax} caracteres`);
      }
      const max = Number(maxDownloads);
      if (!Number.isInteger(max) || max < 0 || max > settings.maxDownloadsLimit) throw badRequest('Límite de descargas no válido');
      repo.upsert(token, password ? hashPassword(password) : '', max);
      return this.describe(token);
    },

    describe(token) {
      const p = repo.get(token);
      return { protected: Boolean(p?.pw_hash), maxDownloads: p?.max_downloads ?? 0, downloads: p?.downloads ?? 0 };
    },

    list() {
      repo.purgeOrphans();
      return Object.fromEntries(repo.all().map((p) => [p.token, { protected: Boolean(p.protected), maxDownloads: p.max_downloads, downloads: p.downloads }]));
    },

    /** Valor de cookie que acredita que este navegador conoce la contraseña (o lanza 401). */
    unlock(token, password) {
      const p = repo.get(token);
      if (!p?.pw_hash) return null;
      if (!verifyPassword(String(password ?? ''), p.pw_hash)) throw new HttpError(401, 'Contraseña incorrecta');
      return unlockValue(token, now() + settings.unlockTtlMs);
    },

    isUnlocked(token, cookie = '') {
      const [exp, sig] = String(cookie).split('.');
      return Boolean(exp && sig && Number(exp) > now() && safeEqual(sig, unlockValue(token, exp).split('.')[1]));
    },

    /** Decide el acceso: 'open' | 'locked' | 'exhausted' | 'ok'. `counted`: la petición inicia una descarga (se registra y, si hay límite, consume cupo). */
    evaluate(token, { unlockedCookie, range, method = 'GET' }) {
      const start = method === 'GET' && isStart(range);
      const p = repo.get(token);
      if (!p) return { state: 'ok', counted: start };
      if (p.pw_hash && !this.isUnlocked(token, unlockedCookie)) return { state: 'locked' };
      if (!start) return { state: 'ok', counted: false };
      if (!repo.consume(token)) return { state: 'exhausted' };
      return { state: 'ok', counted: true };
    },
  };
}
