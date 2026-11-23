import { randomUUID } from 'node:crypto';
import { conflict } from '../../utils/errors.js';
import { normalizeOptions } from './options.js';
import { spotifySource } from './spotify-source.js';
import { alreadyDownloaded } from './dedupe.js';

export function enqueueSpotifyJob(input, { repo, catalog, maxQueue, drain }, folder = '') {
    const source = spotifySource(input);
    if (repo.pendingCount() >= maxQueue) throw conflict('Hay demasiadas descargas pendientes');
    if (repo.activeSources().some((job) => job.sourceId === source.id)) {
      throw conflict('Este enlace de Spotify ya está en cola');
    }
    const options = normalizeOptions({ folder });
    if (alreadyDownloaded(repo.bySource(source.id, 'spotdl'), options, catalog)) return { accepted: [], skipped: [source.id] };
    const created = Date.now();
    const job = { id: randomUUID(), sourceId: source.id, url: source.url,
      title: source.type + ' · ' + source.url.split('/').at(-1),
      artist: '', album: '', format: 'spotdl', options,
      channel: '', playlist: '', year: '', created };
    repo.insert(job);
    queueMicrotask(drain);
    return { accepted: [job.id], skipped: [] };
  }

