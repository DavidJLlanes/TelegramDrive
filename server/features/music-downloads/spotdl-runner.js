import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../../config/index.js';
import { execute } from './runner.js';
import { spotifySource } from './spotify-source.js';
import { spotdlEnv } from './spotdl-env.js';
import { manifestCount, manifestListName, spotdlFiles } from './spotdl-files.js';

const BIN = process.env.SPOTDL_BIN || path.join(config.dataDir, 'tools', 'spotdl-venv', 'bin', 'spotdl');
const TIMEOUT = 3 * 60 * 60_000;
// Leer los metadatos de hasta 150 pistas puede tardar varios minutos; SpotDL sale con código 0 al recibir SIGTERM.
const SAVE_TIMEOUT = 15 * 60_000;

export const spotdlRunner = {
  async installed() {
    try { await execute(BIN, ['--version'], { timeout: 20_000, env: await spotdlEnv() }); return true; }
    catch { return false; }
  },
  async diagnose() {
    try { await execute(BIN, ['--version'], { timeout: 20_000, env: await spotdlEnv() }); return ''; }
    catch (error) { return String(error.message || error).slice(0, 300); }
  },
  async download(input, dir, { signal, onProgress } = {}) {
    const source = spotifySource(input);
    const env = await spotdlEnv();
    const manifest = path.join(dir, 'songs.spotdl');
    const saveOutput = await execute(BIN, ['save', source.url, '--save-file', manifest,
      '--log-level', 'INFO', '--threads', '4'], { signal, timeout: SAVE_TIMEOUT, env });
    let saved;
    try {
      saved = await fs.readFile(manifest, 'utf8');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      throw new Error('SpotDL no generó los metadatos de Spotify. Comprueba que la lista sea pública y accesible: '
        + String(saveOutput).trim().slice(-400));
    }
    const songs = manifestCount(saved);
    onProgress?.(5);
    const output = path.join(dir, '{artist}', '{album}', '{title}.{output-ext}');
    await execute(BIN, ['download', manifest, '--format', 'mp3', '--bitrate', '128k',
      '--output', output, '--threads', '2', '--log-level', 'ERROR'], {
      signal, timeout: TIMEOUT, env,
    });
    if (signal?.aborted) throw new Error('Descarga cancelada');
    const files = await spotdlFiles(dir);
    if (files.length > songs) throw new Error('SpotDL produjo más canciones de las previstas');
    onProgress?.(75);
    const playlist = source.type === 'playlist' ? manifestListName(saved) : '';
    return files.map((file) => ({ ...file, playlist }));
  },
};
