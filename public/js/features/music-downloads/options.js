import { h } from '../../core/dom.js';

const select = (label, values) => {
  const control = h('select', { class: 'input' }, ...values.map(([value, text]) => h('option', { value }, text)));
  return { control, element: h('label', { class: 'md-field' }, h('span', {}, label), control) };
};

export function downloadOptions() {
  const audioFormat = select('Formato de audio', [['mp3', 'MP3'], ['m4a', 'M4A'], ['opus', 'Opus']]);
  const audioBitrate = select('Calidad MP3', [['320', '320 kbps'], ['192', '192 kbps'], ['128', '128 kbps']]);
  const videoQuality = select('Resolución máxima de vídeo', [['best', 'Mejor disponible'],
    ['2160', '4K'], ['1440', '1440p'], ['1080', '1080p'], ['720', '720p'], ['480', '480p'], ['360', '360p']]);
  const videoGroup = select('Organizar vídeos por', [['flat', 'Todos en Vídeos'], ['channel', 'Canal'],
    ['year', 'Año'], ['playlist', 'Lista de reproducción']]);
  const audioGroup = select('Organizar audio por', [['playlist', 'Carpeta de la lista (si es lista)'],
    ['artist', 'Artista / Álbum']]);
  const subtitles = h('input', { type: 'checkbox' });
  const thumbnail = h('input', { type: 'checkbox', checked: true });
  const element = h('div', { class: 'md-options' },
    audioFormat.element, audioBitrate.element, audioGroup.element, videoQuality.element, videoGroup.element,
    h('label', { class: 'md-toggle' }, subtitles, 'Descargar subtítulos disponibles (ES/EN)'),
    h('label', { class: 'md-toggle' }, thumbnail, 'Incluir carátula en MP3'));
  return {
    element,
    values: () => ({
      audioFormat: audioFormat.control.value, audioBitrate: audioBitrate.control.value, audioGroup: audioGroup.control.value,
      videoQuality: videoQuality.control.value, videoGroup: videoGroup.control.value,
      subtitles: subtitles.checked, thumbnail: thumbnail.checked,
    }),
  };
}
