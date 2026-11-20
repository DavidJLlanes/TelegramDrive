// yt-dlp and FFmpeg run without a shell. No credentials or arbitrary executable args from clients.
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../../config/index.js';
import { sourceUrl, entryOf } from './metadata.js';

const YTDLP = process.env.YTDLP_BIN || path.join(config.dataDir, 'tools', 'yt-dlp-venv', 'bin', 'yt-dlp');
const JS = ['--js-runtimes', 'node'];
const BASE = ['--ignore-config', '--no-warnings', ...JS];
const MAX_OUTPUT = 5 * 1024 * 1024;

export function execute(bin, args, { signal, timeout = 60_000, onLine } = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let output = '', err = '', buffer = '', done = false;
    const finish = (error) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      if (error) reject(error); else resolve(output);
    };
    const abort = () => proc.kill('SIGTERM');
    const timer = setTimeout(() => proc.kill('SIGTERM'), timeout);
    timer.unref?.();
    if (signal?.aborted) abort();
    else signal?.addEventListener('abort', abort, { once: true });
    proc.stdout.on('data', (chunk) => {
      if (done) return;
      output += chunk.toString();
      buffer += chunk.toString();
      while (buffer.includes('\n')) {
        const at = buffer.indexOf('\n');
        onLine?.(buffer.slice(0, at).trim());
        buffer = buffer.slice(at + 1);
      }
      if (output.length > MAX_OUTPUT) proc.kill('SIGTERM');
    });
    proc.stderr.on('data', (chunk) => { err = (err + chunk.toString()).slice(-1500); });
    proc.on('error', (e) => finish(new Error(e.code === 'ENOENT' ? 'Falta instalar ' + path.basename(bin) : e.message)));
    proc.on('close', (code) => finish(signal?.aborted ? new Error('Descarga cancelada')
      : code === 0 ? null : new Error((err.trim() || 'El proceso de descarga falló').slice(-500))));
  });
}

export const musicRunner = {
  async installed() {
    try { await execute(YTDLP, ['--version'], { timeout: 8_000 }); return true; }
    catch { return false; }
  },
  async inspect(input) {
    const source = sourceUrl(input);
    const args = [...BASE, '--dump-single-json', '--skip-download', '--no-progress',
      ...(source.type === 'playlist' ? ['--flat-playlist', '--playlist-end', '50'] : ['--no-playlist']), source.url];
    const info = JSON.parse(await execute(YTDLP, args, { timeout: 90_000 }));
    const raw = source.type === 'playlist' ? info.entries || [] : [info];
    const items = raw.filter(Boolean).map((item) => entryOf(item));
    if (!items.length) throw new Error('No se encontraron canciones para descargar');
    return { items, playlist: source.type === 'playlist', truncated: raw.length >= 50 };
  },
  async download(url, dir, meta, { signal, onProgress, format = 'mp3' } = {}) {
    sourceUrl(url);
    const video = format === 'video';
    const template = path.join(dir, 'track.%(ext)s');
    const common = [...BASE, '--no-playlist', '--no-overwrites',
      '--max-filesize', '1G', '--socket-timeout', '20',
      '--retries', '2', '--fragment-retries', '2',
      '--newline', '--progress-template', 'download:%(progress._percent_str)s'];
    const args = video
      ? [...common, '-f', 'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/bv*+ba/b',
        '--merge-output-format', 'mp4', '--remux-video', 'mp4',
        '--output', template, url]
      : [...common, '-f', 'bestaudio/best', '--extract-audio',
        '--audio-format', 'mp3', '--audio-quality', '0',
        '--embed-metadata', '--embed-thumbnail', '--convert-thumbnails', 'jpg',
        '--output', template, url];
    await execute(YTDLP, args, { signal, timeout: 3 * 60 * 60_000, onLine(line) {
      const m = /download:\s*(\d+(?:\.\d+)?)%/.exec(line);
      if (m) onProgress?.(Math.min(75, Math.round(Number(m[1]) * 0.75)));
    } });
    const source = path.join(dir, video ? 'track.mp4' : 'track.mp3');
    const result = path.join(dir, video ? 'final.mp4' : 'final.mp3');
    if (video) {
      await fs.rename(source, result);
    } else {
      const tags = ['-metadata', 'title=' + meta.title, '-metadata', 'artist=' + meta.artist,
        '-metadata', 'album=' + meta.album];
      await execute('ffmpeg', ['-nostdin', '-hide_banner', '-loglevel', 'error', '-y',
        '-i', source, '-map', '0', '-c', 'copy', ...tags, '-id3v2_version', '3', result],
      { signal, timeout: 90_000 });
    }
    const stat = await fs.stat(result);
    if (stat.size < 128 || stat.size > 1024 ** 3) {
      throw new Error('Archivo inválido o superior a 1 GB');
    }
    return { path: result, size: stat.size };
  }
};
