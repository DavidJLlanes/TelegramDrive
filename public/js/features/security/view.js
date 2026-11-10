import { h, fill } from '../../core/dom.js';
import { formatBytes, formatDateTime } from '../../core/format.js';
import { reload } from '../../core/drive.js';
import { toast, toastError } from '../../ui/toast.js';
import { securityApi } from './api.js';

const EVENTS = { login: 'Inicio de sesión', share: 'Enlace compartido' };

export const loadSecurity = async () => {
  const [summary, log, backup] = await Promise.all([securityApi.summary(), securityApi.log(60), securityApi.backupStatus()]);
  return { summary, entries: log.entries, backup };
};

const row = (main, sub, side) => h('div', { class: 'pg-row' }, h('div', { class: 'pg-main' }, h('strong', {}, main), h('span', {}, sub)), h('div', { class: 'pg-side' }, side));

function devicesPanel({ devices, newDevices }) {
  const confirm = h('button', { class: 'btn btn-primary', type: 'button', onclick: async () => {
    try { await securityApi.ackDevices(); toast('Dispositivos confirmados', { type: 'ok' }); reload(); } catch (err) { toastError(err); }
  } }, 'Confirmar que son míos');
  return h('section', { class: 'pg-panel' },
    h('h2', {}, 'Dispositivos con acceso'),
    newDevices.length ? h('p', { class: 'pg-hint' }, `${newDevices.length === 1 ? 'Ha entrado un dispositivo nuevo' : `Han entrado ${newDevices.length} dispositivos nuevos`}. Si no lo reconoces, cambia la contraseña y el SESSION_SECRET del servidor.`) : null,
    h('div', { class: 'pg-rows' }, devices.map((d) => row(d.label, `Última IP ${d.ip || '—'} · ${formatDateTime(d.lastSeen)}`, d.isNew ? h('span', { class: 'pg-badge warn' }, 'Nuevo') : `${d.seen} ${d.seen === 1 ? 'acceso' : 'accesos'}`))),
    newDevices.length ? confirm : null);
}

function activityPanel(entries, failed24h) {
  return h('section', { class: 'pg-panel' },
    h('h2', {}, 'Actividad reciente'),
    h('p', { class: 'pg-hint' }, failed24h ? `${failed24h} intentos fallidos en las últimas 24 horas.` : 'Sin intentos fallidos en las últimas 24 horas.'),
    entries.length ? h('div', { class: 'pg-rows' }, entries.map((e) => row(
      `${EVENTS[e.event] ?? e.event}${e.detail && !e.ok ? ` · ${e.detail}` : ''}`, `${e.device} · IP ${e.ip || '—'}`,
      h('span', {}, h('span', { class: `pg-badge ${e.ok ? 'ok' : 'warn'}` }, e.ok ? 'Correcto' : 'Rechazado'), ' ', formatDateTime(e.ts))))) : h('p', { class: 'pg-hint' }, 'Aún no hay actividad registrada.'));
}

function backupPanel(b) {
  const run = h('button', { class: 'btn', type: 'button', disabled: !b.configured || b.running, onclick: async (e) => {
    e.currentTarget.disabled = true;
    try { const r = await securityApi.runBackup(); toast(`Copia enviada (${formatBytes(r.size)})`, { type: 'ok' }); } catch (err) { toastError(err); }
    reload();
  } }, 'Copiar ahora');
  const state = !b.configured ? 'Sin configurar: añade BACKUP_PASSPHRASE (12+ caracteres) y BACKUP_ENABLED=true al .env del servidor.'
    : b.lastError ? `Último intento fallido: ${b.lastError}`
      : b.lastOk ? `Última copia: ${formatDateTime(b.lastOk)} (${formatBytes(b.lastSize)})` : 'Aún no se ha hecho ninguna copia.';
  return h('section', { class: 'pg-panel' },
    h('h2', {}, 'Copia de seguridad cifrada'),
    h('p', { class: 'pg-hint' }, 'Guarda lo que no se puede reconstruir desde Telegram (enlaces compartidos, registro de accesos, letras, ajustes). Se envía cifrada a un chat aparte.'),
    h('div', { class: 'pg-rows' },
      row('Estado', state, b.enabled ? h('span', { class: 'pg-badge ok' }, `cada ${b.everyHours} h`) : h('span', { class: 'pg-badge' }, 'Automática desactivada')),
      row('Destino', `Chat ${b.chat} · se conservan ${b.keep} copias`, b.includesSession ? 'Incluye la sesión' : 'Sin la sesión')),
    run);
}

export function renderSecurity(el, { data }) {
  fill(el, devicesPanel(data.summary), activityPanel(data.entries, data.summary.failed24h), backupPanel(data.backup));
}
