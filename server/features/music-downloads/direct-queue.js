import { randomUUID } from 'node:crypto';
import { alreadyDownloaded } from './dedupe.js';
import { conflict } from '../../utils/errors.js';
import { directSource } from './direct-url.js';
import { normalizeOptions } from './options.js';

  export function enqueueDirectJob(input, { repo, catalog, maxQueue, drain }, folder = '') {
    const src = directSource(input);
    const outstanding = repo.activeSources();
    if (repo.pendingCount() >= maxQueue) throw conflict('Hay demasiadas descargas pendientes');
    if (outstanding.some((j) => j.sourceId === src.id)) throw conflict('Esta descarga ya está en cola');
    const options = normalizeOptions({ folder });
    if (alreadyDownloaded(repo.bySource(src.id, 'direct'), options, catalog)) return { accepted: [], skipped: [src.id] };
    const created = Date.now();
    const j = { id: randomUUID(), sourceId: src.id, url: src.url,
      title: src.name, artist: '', album: '', format: 'direct', options,
      channel: '', playlist: '', year: '', created };
    repo.insert(j);
    queueMicrotask(drain);
    return { accepted: [j.id], skipped: [] };
  }

