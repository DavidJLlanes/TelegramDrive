import { describeAgent, deviceId } from './agent.js';

const DAY = 86_400_000;
const clip = (v, n) => String(v ?? '').slice(0, n);

/**
 * Registra inicios de sesión y accesos a enlaces, detecta dispositivos nuevos y rachas de fallos.
 * `notify(texto)` es opcional (webhook); `now()` se inyecta para poder probar el tiempo.
 */
export function createService({ repo, settings, notify = () => {}, now = Date.now }) {
  const alerted = new Map(); // ip → ts del último aviso de fuerza bruta (como mucho uno por hora)

  function record(event, ok, { ip, ua, detail = '' }) {
    repo.insert({ ts: now(), event, ok, ip: clip(ip, 64), agent: clip(ua, 300), detail: clip(detail, 200) });
  }

  function trackDevice({ ip, ua }) {
    const id = deviceId(ua);
    const label = describeAgent(ua);
    const ts = now();
    const known = repo.getDevice(id);
    if (known) { repo.touchDevice(id, ts, clip(ip, 64)); return; }
    const first = repo.deviceCount() === 0; // el primer dispositivo de la historia es el propietario: no genera aviso
    repo.addDevice({ id, label, ts, ip: clip(ip, 64), acked: first });
    if (!first) notify(`Nuevo dispositivo con acceso: ${label} (IP ${ip}). Si no has sido tú, cambia la contraseña y SESSION_SECRET.`);
  }

  function checkBruteForce({ ip }) {
    const since = now() - settings.failAlertWindowMs;
    if (repo.countFailsSince(since, clip(ip, 64)) < settings.failAlertCount) return;
    if (now() - (alerted.get(ip) ?? 0) < 3_600_000) return;
    alerted.set(ip, now());
    notify(`Telegram Drive: ${settings.failAlertCount}+ intentos de acceso fallidos desde ${ip} en 10 minutos.`);
  }

  return {
    onLogin(e) {
      record('login', e.ok, { ...e, detail: e.reason });
      if (e.ok) trackDevice(e); else checkBruteForce(e);
    },
    onShare(e) { record('share', e.ok, { ...e, detail: `${e.token?.slice(0, 6) ?? ''}… ${e.reason ?? ''}`.trim() }); },
    list: (limit = 100, event) => repo.list(Math.min(Math.max(1, Math.floor(Number(limit)) || 100), 500), event || undefined)
      .map((r) => ({ id: r.id, ts: r.ts, event: r.event, ok: Boolean(r.ok), ip: r.ip, device: describeAgent(r.agent), detail: r.detail })),
    summary() {
      const devices = repo.devices().map((d) => ({ id: d.id, label: d.label, firstSeen: d.first_seen, lastSeen: d.last_seen, ip: d.last_ip, seen: d.seen, isNew: !d.acked }));
      return { failed24h: repo.failsSince(now() - DAY), lastLogin: repo.lastLogin(), devices, newDevices: devices.filter((d) => d.isNew) };
    },
    ackDevices: () => repo.ackDevices(),
    prune: () => repo.prune(now() - settings.retentionDays * DAY, settings.maxRows),
  };
}
