import { h, fill } from '../../core/dom.js';
import { icon } from '../../core/icons.js';
import { formatBytes } from '../../core/format.js';

/** Panel flotante de subidas. `controller`: { running(), retryFailed() }. Pinta por trabajo y un resumen al final. */
export function createPanel(controller) {
  let root = null; let list = null; let foot = null;
  const rows = new WeakMap();

  const ensure = () => {
    if (root) return;
    list = h('div');
    foot = h('div', { class: 'upload-foot' });
    root = h('aside', { class: 'upload-panel', 'aria-label': 'Subidas', 'aria-live': 'polite' },
      h('div', { class: 'upload-head' }, h('span', {}, 'Subidas'),
        h('button', { class: 'btn btn-icon btn-ghost', 'aria-label': 'Cerrar', onclick: () => { if (!controller.running()) close(); } }, icon('close'))),
      list, foot);
    document.body.append(root);
  };
  const close = () => { root?.remove(); root = null; list = null; };

  const label = (job) => {
    if (job.status === 'done') return `Listo · ${formatBytes(job.result?.size ?? job.file.size)}`;
    if (job.status === 'error') return job.error?.message ?? 'Error';
    if (job.retrying) return `Reintentando (${job.attempt})…`;
    if (job.status === 'running') return job.progress >= 1 ? 'Enviando a Telegram…' : `Subiendo… ${Math.round(job.progress * 100)} %`;
    return 'En cola';
  };

  function paint(job) {
    let row = rows.get(job);
    if (!row) {
      row = { bar: h('i'), state: h('span', { class: 'state' }) };
      row.el = h('div', { class: 'upload-row' }, h('div', { class: 'name', title: job.rel || job.file.name }, job.rel || job.file.name), h('div', { class: 'progress' }, row.bar), row.state);
      rows.set(job, row);
      list.append(row.el);
    }
    row.bar.style.width = `${Math.round(job.progress * 100)}%`;
    row.state.textContent = label(job);
    row.state.title = row.state.textContent;
    row.el.classList.toggle('done', job.status === 'done');
    row.el.classList.toggle('error', job.status === 'error');
  }

  return {
    update(jobs) { ensure(); jobs.forEach(paint); },
    /** Resumen cuando la cola queda vacía: cuántos fueron bien y botón para reintentar los fallidos. */
    finish({ done, failed }) {
      if (!root) return;
      const text = failed ? `${done} subido${done === 1 ? '' : 's'}, ${failed} con error` : `${done} subido${done === 1 ? '' : 's'} correctamente`;
      fill(foot, h('span', { class: failed ? 'bad' : 'ok' }, text),
        failed ? h('button', { class: 'btn', type: 'button', onclick: () => { fill(foot); controller.retryFailed(); } }, 'Reintentar fallidos') : null);
    },
    clearFoot: () => foot?.replaceChildren(),
  };
}
