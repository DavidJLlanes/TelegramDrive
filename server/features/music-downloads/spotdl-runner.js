import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../../config/index.js';
import { execute } from './runner.js';
import { spotifySource } from './spotify-source.js';
import { manifestCount, spotdlFiles } from './spotdl-files.js';

const BIN = process.env.SPOTDL_BIN || path.join(config.dataDir, 'tools', 'spotdl-venv', 'bin', 'spotdl');
const TIMEOUT = 3 * 60 * 60_000;

export const spotdlRunner = {
  async installed() {
    try { await execute(BIN, ['--version'], { timeout: 20_000 }); return true; }
    catch { return false; }
  },
  async diagnose() {
    try { await execute(BIN, ['--version'], { timeout: 20_000 }); return ''; }
    catch (error) { return String(error.message || error).slice(0, 300); }
  },
  async download(input, dir, { signal, onProgress } = {}) {
    const source = spotifySource(input);
    const manifest = path.join(dir, 'songs.spotdl');
    await execute(BIN, ['save', source.url, '--save-file', manifest,
      '--log-level', 'ERROR', '--threads', '1'], { signal, timeout: 120_000 });
    const songs = manifestCount(await fs.readFile(manifest, 'utf8'));
    onProgress?.(5);
    const output = path.join(dir, '{artist}', '{album}', '{title}.{output-ext}');
    await execute(BIN, ['download', source.url, '--format', 'mp3', '--bitrate', '128k',
      '--output', output, '--threads', '1', '--log-level', 'ERROR'], {
      signal, timeout: TIMEOUT,
    });
    if (signal?.aborted) throw new Error('Descarga cancelada');
    const files = await spotdlFiles(dir);
    if (files.length > songs) throw new Error('SpotDL produjo más canciones de las previstas');
    onProgress?.(75);
    return files;
  },
};
