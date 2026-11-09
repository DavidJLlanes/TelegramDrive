import { parseExif } from './exif.js';

/** Lee el EXIF de las fotos JPEG nuevas en segundo plano (solo la cabecera de cada una). */
export function createScanner({ repo, tg, settings, log = console }) {
  const state = { running: false, lastRun: 0, lastError: '' };

  async function readOne(id) {
    let message;
    try { message = await tg.getMessage(id); } catch (err) {
      if (err.status === 404) { repo.save(id, {}); return; } // ya no existe en Telegram: no insistir
      throw err;
    }
    const size = Number(message.media.document.size);
    const parts = [];
    for await (const chunk of tg.readRange(message, 0, Math.min(size, settings.headBytes) - 1)) parts.push(chunk);
    repo.save(id, parseExif(Buffer.concat(parts)) ?? {});
  }

  return {
    state,
    async run() {
      if (state.running) return;
      state.running = true; state.lastError = '';
      try {
        for (;;) {
          const ids = repo.pending(settings.batch);
          if (!ids.length) break;
          const queue = [...ids];
          await Promise.all(Array.from({ length: Math.min(settings.concurrency, queue.length) }, async () => {
            while (queue.length) await readOne(queue.shift());
          }));
        }
      } catch (err) {
        state.lastError = err.message;
        log.warn?.(`[fotos] lectura de EXIF interrumpida: ${err.message}`);
      } finally { state.running = false; state.lastRun = Date.now(); }
    },
  };
}
