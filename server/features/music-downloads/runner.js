// yt-dlp and FFmpeg run without a shell. No credentials or arbitrary executable args from clients.
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../../config/index.js';
import { sourceUrl, entryOf } from './metadata.js';
import { normalizeOptions } from './options.js';
import { formatArgs, extrasArgs } from './format-args.js';
import { progressLine } from './progress.js';

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
    return { items, playlist: source.type === 'playlist', playlistTitle: String(info.title || '').slice(0, 180), truncated: raw.length >= 50 };
  },
  async download(url, dir, meta, { signal, onProgress, onTelemetry, format = 'mp3', options: rawOptions } = {}) {
    const options = normalizeOptions(rawOptions);
    sourceUrl(url);
    const video = format === 'video';
    const template = path.join(dir, 'track.%(ext)s');
    const common = [...BASE, '--no-playlist', '--no-overwrites',
      '--max-filesize', '1G', '--socket-timeout', '20',
      '--retries', '2', '--fragment-retries', '2',
      '--newline', '--progress-template', 'download:%(progress._percent_str)s speed:%(progress._speed_str)s eta:%(progress._eta_str)s'];
    const args = [...common, ...formatArgs(format, options), ...extrasArgs(options, format), '--output', template, url];
    await execute(YTDLP, args, { signal, timeout: 3 * 60 * 60_000, onLine(line) {
      const progress = progressLine(line);
      if (progress.progress !== undefined) onProgress?.(progress.progress);
      if (progress.speed || progress.eta) onTelemetry?.(progress);
    } });
    const ext = video ? 'mp4' : options.audioFormat;
    const source = path.join(dir, 'track.' + ext);
    const result = path.join(dir, 'final.' + ext);
    if (video || options.audioFormat !== 'mp3') {
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
