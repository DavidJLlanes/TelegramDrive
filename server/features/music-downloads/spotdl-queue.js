import { randomUUID } from 'node:crypto';
import { conflict } from '../../utils/errors.js';
import { normalizeOptions } from './options.js';
import { spotifySource } from './spotify-source.js';

export function enqueueSpotifyJob(input, { repo, catalog, maxQueue, drain }) {
    const source = spotifySource(input);
    if (repo.pendingCount() >= maxQueue) throw conflict('Hay demasiadas descargas pendientes');
    if (repo.activeSources().some((job) => job.sourceId === source.id)) {
      throw conflict('Este enlace de Spotify ya está en cola');
    }
    let previous = repo.bySource(source.id, 'spotdl');
    if (previous) { try { catalog.getFile(previous.fileId); } catch { previous = null; } }
    if (previous) return { accepted: [], skipped: [source.id] };
    const created = Date.now();
    const job = { id: randomUUID(), sourceId: source.id, url: source.url,
      title: source.type + ' · ' + source.url.split('/').at(-1),
      artist: '', album: '', format: 'spotdl', options: normalizeOptions(),
      channel: '', playlist: '', year: '', created };
    repo.insert(job);
    queueMicrotask(drain);
    return { accepted: [job.id], skipped: [] };
  }

