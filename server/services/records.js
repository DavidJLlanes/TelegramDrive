import { decode } from '../telegram/codec.js';
import { kindOf } from '../utils/media-kind.js';

/** Mensaje de Telegram -> registro normalizado (o null si no es nuestro). */
export function toRecord(message) {
  const meta = decode(message.message);
  if (!meta) return null;
  if (meta.type === 'folder') {
    return { type: 'folder', id: meta.id, msgId: message.id, parent: meta.parent, name: meta.name, trashed: meta.trashed };
  }
  if (meta.type === 'playlist') return { type: 'playlist', id: meta.id, msgId: message.id, name: meta.name, ids: meta.ids };
  const doc = message.media?.document;
  if (!doc) return null;
  const mime = doc.mimeType || 'application/octet-stream';
  return {
    type: 'file', msgId: message.id, folder: meta.folder, name: meta.name, size: Number(doc.size),
    mime, kind: kindOf(meta.name, mime), date: message.date * 1000, thumb: doc.thumbs?.length ? 1 : 0,
    trashed: meta.trashed, ovr: meta.ovr,
  };
}
