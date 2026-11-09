import { parseBuffer } from 'music-metadata';

/** Letra incrustada en las etiquetas (ID3 USLT, Vorbis LYRICS, MP4 ©lyr…) de la cabecera de un archivo; '' si no hay. */
export async function extractLyrics(head, name, size) {
  try {
    const { common } = await parseBuffer(head, { path: name, size }, { skipPostHeaders: true, duration: false });
    const first = (common.lyrics ?? []).map((l) => (typeof l === 'string' ? l : l?.text)).find((t) => t && t.trim());
    return String(first ?? '').replace(/\0/g, '').replace(/\r\n?/g, '\n').trim();
  } catch { return ''; }
}
