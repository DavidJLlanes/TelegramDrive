import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { badRequest, conflict, notFound } from '../../utils/errors.js';
import { sourceUrl, classify } from './metadata.js';
import { ensureDestination } from './folders.js';
import { musicRunner } from './runner.js';

const BUSY = new Set(['queued', 'analyzing', 'downloading', 'uploading']);
const MAX_QUEUE = 60;

export function createService({ repo, catalog, tmpDir, runner = musicRunner }) {
  let active = null;
  let stopped = true;
  let checking = null;
  const checkSetup = () => {
    checking ??= runner.installed().finally(() => { setTimeout(() => { checking = null; }, 60_000).unref?.(); });
    return checking;
  };
  const patch = (id, fields) => repo.patch(id, fields);

  async function run(job, signal) {
    const dir = await fs.mkdtemp(path.join(tmpDir, 'music-'));
    try {
      patch(job.id, { state: 'analyzing', progress: 0, error: '' });
      const result = await runner.inspect(job.url);
      const info = result.items[0];
      if (!info || info.id !== job.sourceId) throw new Error('La fuente no coincide con la canción solicitada');
      const chosen = classify({ track: info.title, artist: info.artist, album: info.album }, {
        title: job.title || undefined, artist: job.artist || undefined, album: job.album || undefined,
      }, job.format);
      if (signal.aborted) throw new Error('Descarga cancelada');
      patch(job.id, { state: 'downloading', title: chosen.title, artist: chosen.artist, album: chosen.album });
      const downloaded = await runner.download(job.url, dir, chosen, {
        signal, format: job.format, onProgress: (p) => { if (!signal.aborted) patch(job.id, { progress: Math.max(0, Math.min(75, p)) }); },
      });
      if (signal.aborted) throw new Error('Descarga cancelada');
      const destination = await ensureDestination(catalog, { ...chosen, format: job.format });
      patch(job.id, { state: 'uploading', progress: 80, destination });
      const file = await catalog.fileOps.upload({
        parent: destination, name: chosen.fileName, path: downloaded.path, size: downloaded.size,
        onProgress: (fraction) => patch(job.id, { progress: 80 + Math.round(Number(fraction) * 19) }),
      });
      patch(job.id, { state: 'done', progress: 100, fileId: file.id });
      if (job.format !== 'video') catalog.tagger.kick();
    } finally {
      await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  }

  async function drain() {
    if (stopped || active) return;
    const job = repo.outstanding()[0];
    if (!job) return;
    const ctrl = new AbortController();
    active = { id: job.id, ctrl };
    try { await run(job, ctrl.signal); }
    catch (e) {
      patch(job.id, { state: ctrl.signal.aborted ? 'cancelled' : 'failed', error: String(e.message).slice(0, 300) });
    } finally {
      active = null;
      if (!stopped) queueMicrotask(drain);
    }
  }

  function enqueue(items) {
    if (!Array.isArray(items) || !items.length || items.length > 50) throw badRequest('Indica entre 1 y 50 canciones');
    const outstanding = repo.list().filter((j) => BUSY.has(j.state));
    if (outstanding.length + items.length > MAX_QUEUE) throw conflict('Hay demasiadas descargas pendientes');
    const accepted = [], skipped = [];
    const queued = new Set(outstanding.map((j) => j.sourceId + ':' + j.format));
    for (const item of items) {
      const src = sourceUrl(item?.url);
      const format = item?.format === 'video' ? 'video' : 'mp3';
      if (src.type !== 'video') throw badRequest('Primero analiza la lista de reproducción');
      let previous = repo.bySource(src.id, format);
      if (previous) { try { catalog.getFile(previous.fileId); } catch { previous = null; } }
      const key = src.id + ':' + format;
      if (previous || queued.has(key)) { skipped.push(src.id); continue; }
      const created = Date.now();
      const j = { id: randomUUID(), sourceId: src.id, url: src.url,
        title: String(item.title ?? '').slice(0, 180), artist: String(item.artist ?? '').slice(0, 180),
        album: String(item.album ?? '').slice(0, 180), format, created };
      repo.insert(j); queued.add(key); accepted.push(j.id);
    }
    queueMicrotask(drain);
    return { accepted, skipped };
  }

  function retry(id) {
    const job = repo.get(id);
    if (!job) throw notFound('Descarga no encontrada');
    if (!['failed', 'cancelled', 'interrupted'].includes(job.state)) throw conflict('Esta descarga no se puede reintentar');
    patch(id, { state: 'queued', progress: 0, error: '' });
    queueMicrotask(drain);
    return { queued: true };
  }

  function cancel(id) {
    const job = repo.get(id);
    if (!job) throw notFound('Descarga no encontrada');
    if (job.state === 'uploading') throw conflict('La subida a Telegram está terminando; no se puede cancelar');
    if (!BUSY.has(job.state)) throw conflict('Esta descarga ya ha finalizado');
    if (active?.id === id) active.ctrl.abort();
    else patch(id, { state: 'cancelled', error: 'Cancelada por el usuario' });
    return { cancelled: true };
  }

  return {
    async status() { return { available: await checkSetup(), jobs: repo.list(), root: '/Descargas de Internet' }; },
    inspect: (url) => runner.inspect(sourceUrl(url).url),
    enqueue, retry, cancel,
    remove(id) { if (!repo.delete(id)) throw conflict('No se puede eliminar una descarga en curso'); return { removed: true }; },
    start() { stopped = false; repo.interrupt(); queueMicrotask(drain); },
    stop() { stopped = true; active?.ctrl.abort(); },
  };
}
