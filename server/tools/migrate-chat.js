// Copia el contenido de la app de un chat de Telegram a otro (p. ej. de Mensajes guardados a un grupo privado).
// No borra nada del origen y se puede repetir: lo que ya está en el destino se omite.
import { TAG } from '../telegram/codec.js';

const keyOf = (m) => `${m.message}|${m.media?.document?.size ?? 0}`;

/**
 * @param {object} o
 * @param {object} o.tg       TelegramService (cualquier chat; solo aporta el cliente)
 * @param {string} o.from     chat de origen ("me", @usuario o ID)
 * @param {string} o.to       chat de destino
 * @param {boolean} [o.dryRun]
 * @param {(msg: string) => void} [o.log]
 * @param {(ms: number) => Promise<void>} [o.sleep]  pausa entre lotes (Telegram limita el ritmo)
 */
export async function migrateChat({ tg, from, to, dryRun = false, log = () => {}, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  if (String(from).trim() === String(to).trim()) throw new Error('El origen y el destino son el mismo chat');
  const source = await tg.forChat(from, '--from');
  const target = await tg.forChat(to, '--to');

  const existing = new Set();
  for await (const m of target.iterTagged({ tag: TAG })) existing.add(keyOf(m));

  const pending = [];
  let bytes = 0;
  for await (const m of source.iterTagged({ tag: TAG })) {
    if (existing.has(keyOf(m))) continue;
    pending.push(m);
    bytes += Number(m.media?.document?.size ?? 0);
  }
  pending.sort((a, b) => a.id - b.id); // del más antiguo al más nuevo: el destino conserva el orden
  const skipped = existing.size;
  log(`${pending.length} elementos por copiar (${(bytes / 1048576).toFixed(1)} MB); ya estaban en el destino: ${skipped}`);
  if (dryRun || !pending.length) return { copied: 0, pending: pending.length, bytes, dryRun };

  let copied = 0;
  for (let i = 0; i < pending.length; i += 100) {
    const batch = pending.slice(i, i + 100);
    await source.forwardTo(target, batch.map((m) => m.id));
    copied += batch.length;
    log(`copiados ${copied}/${pending.length}`);
    if (i + 100 < pending.length) await sleep(1500);
  }
  return { copied, pending: pending.length, bytes, dryRun: false };
}
