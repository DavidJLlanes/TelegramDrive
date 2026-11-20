/** Build yt-dlp arguments from validated options; no shell expansion or client-supplied flags. */
export function formatArgs(format, options) {
  if (format === 'video') {
    const height = options.videoQuality === 'best' ? '' : '[height<=' + options.videoQuality + ']';
    return ['-f', 'bv*' + height + '+ba/b' + height,
      '--merge-output-format', 'mp4', '--remux-video', 'mp4'];
  }
  const codec = options.audioFormat;
  return ['-f', 'bestaudio/best', '-x', '--audio-format', codec,
    '--audio-quality', codec === 'mp3' ? options.audioBitrate + 'K' : '0'];
}

export function extrasArgs(options, format) {
  const args = [];
  if (format !== 'video') args.push('--embed-metadata');
  if (options.thumbnail && format === 'mp3') args.push('--embed-thumbnail', '--convert-thumbnails', 'jpg');
  if (options.subtitles && format === 'video') args.push('--write-subs', '--write-auto-subs', '--sub-langs', 'es,en');
  return args;
}
