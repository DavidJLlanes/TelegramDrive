// Barra de posición con forma de onda: un lienzo bajo el deslizador (que sigue ahí, invisible, para ratón, táctil y teclado).
import { h } from '../../core/dom.js';

export function attachWave(range, audio, { height = 34 } = {}) {
  const canvas = h('canvas', { class: 'wave', 'aria-hidden': 'true' });
  const wrap = h('div', { class: 'seek-wrap' });
  range.replaceWith(wrap);
  wrap.append(canvas, range);
  let peaks = null;
  let width = 0;

  function draw() {
    if (!peaks || !width) return;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(width * dpr)) { canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = getComputedStyle(canvas).color;
    const progress = audio.duration ? audio.currentTime / audio.duration : 0;
    const slot = width / peaks.length; const bar = Math.max(1.5, slot * 0.62);
    peaks.forEach((p, i) => {
      const bh = Math.max(3, (p / 255) * height);
      ctx.globalAlpha = (i + 0.5) / peaks.length <= progress ? 1 : 0.32;
      ctx.beginPath(); ctx.roundRect(i * slot + (slot - bar) / 2, (height - bh) / 2, bar, bh, bar / 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  const resize = new ResizeObserver(() => { width = wrap.clientWidth; draw(); });
  resize.observe(wrap);
  audio.addEventListener('timeupdate', draw);
  audio.addEventListener('seeked', draw);
  wrap.style.setProperty('--wave-h', `${height}px`);

  return {
    set(next) { peaks = next; wrap.classList.toggle('has-wave', Boolean(next)); draw(); },
    destroy() { resize.disconnect(); audio.removeEventListener('timeupdate', draw); audio.removeEventListener('seeked', draw); },
  };
}
