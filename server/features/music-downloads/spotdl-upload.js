import { spotifySource } from './spotify-source.js';
import { ensureDestination } from './folders.js';

export async function runSpotdlJob({ job, spotify, dir, signal, patch, catalog }) {
    spotifySource(job.url);
    patch(job.id, { state: 'downloading', title: 'Spotify · ' + job.title });
    const files = await spotify.download(job.url, dir, {
      signal, onProgress: (progress) => { if (!signal.aborted) patch(job.id, { progress }); },
    });
    if (signal.aborted) throw new Error('Descarga cancelada');
    let lastFile = null;
    for (let i = 0; i < files.length; i += 1) {
      const song = files[i];
      const destination = await ensureDestination(catalog, {
        artist: song.artist, album: song.album, format: 'mp3', options: {},
      });
      patch(job.id, { state: 'uploading', destination,
        progress: 75 + Math.floor(i / files.length * 24) });
      lastFile = await catalog.fileOps.upload({
        parent: destination, name: song.name, path: song.path, size: song.size,
      });
    }
    patch(job.id, { state: 'done', progress: 100, fileId: lastFile.id });
    catalog.tagger.kick();
}
