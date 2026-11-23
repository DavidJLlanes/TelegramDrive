import { spotifySource } from './spotify-source.js';
import { ensureDestination } from './folders.js';
import { normalizeOptions } from './options.js';
import { songAlreadyUploaded } from './dedupe.js';

export async function runSpotdlJob({ job, spotify, dir, signal, patch, catalog }) {
    const source = spotifySource(job.url);
    const options = normalizeOptions(JSON.parse(job.optionsJson || '{}'));
    patch(job.id, { state: 'downloading', title: String(job.title || '').replace(/^(Spotify · )+/, '') });
    const files = await spotify.download(job.url, dir, {
      signal, onProgress: (progress) => { if (!signal.aborted) patch(job.id, { progress }); },
    });
    if (signal.aborted) throw new Error('Descarga cancelada');
    // Una lista va a una sola carpeta con su nombre; álbumes y canciones sueltas, a Artista/Álbum.
    const listName = source.type === 'playlist' ? files.find((song) => song.playlist)?.playlist || 'Lista de Spotify' : '';
    if (listName) patch(job.id, { title: listName });
    let lastFile = null;
    let existingId = null;
    for (let i = 0; i < files.length; i += 1) {
      const song = files[i];
      const destination = await ensureDestination(catalog, {
        artist: song.artist, album: song.album, playlist: listName, format: 'mp3', options,
      });
      patch(job.id, { state: 'uploading', destination,
        progress: 75 + Math.floor(i / files.length * 24) });
      if (songAlreadyUploaded(catalog, destination, song)) { existingId ??= catalog.fileOps.existing(destination, song.name).id; continue; } // reintento: no se duplica como «(1)»
      lastFile = await catalog.fileOps.upload({
        parent: destination, name: song.name, path: song.path, size: song.size,
      });
    }
    patch(job.id, { state: 'done', progress: 100, fileId: lastFile?.id ?? existingId });
    catalog.tagger.kick();
}
