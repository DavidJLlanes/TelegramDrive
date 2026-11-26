import { h, fill } from '../../core/dom.js';
import { leave } from '../../core/motion.js';
import { icon } from '../../core/icons.js';
import { formatBytes } from '../../core/format.js';

/**
 * Panel flotante de subidas. `controller`: { running(), retryFailed(), retry(job), rename(job), skip(job?) }.
 * Cabecera y pie fijos (solo se desplaza la lista); los fallidos suben arriba con sus acciones. Se puede cerrar siempre:
 * si aún hay subidas, siguen en segundo plano y el panel vuelve a abrirse si alguna falla.
 */
export function createPanel(controller) {
  let root = null; let list = null; let foot = null; let count = null; let timer = null;
  let dismissed = false; // cerrado por el usuario con subidas en marcha
  const rows = new WeakMap();

  const ensure = () => {
    if (root) return;
    list = h('div', { class: 'upload-list' });
    foot = h('div', { class: 'upload-foot' });
    count = h('span', { class: 'upload-count' });
    root = h('aside', { class: 'upload-panel', 'aria-label': 'Subidas', 'aria-live': 'polite' },
      h('div', { class: 'upload-head' }, h('span', {}, 'Subidas'), count,
        h('button', { class: 'btn btn-icon btn-ghost', type: 'button', 'aria-label': 'Cerrar', title: 'Cerrar (las subidas siguen)', onclick: () => close(true) }, icon('close'))),
      list, foot);
    document.body.append(root);
  };
  const cancelClose = () => { clearTimeout(timer); timer = null; };
  function close(byUser = false) {
    cancelClose();
    if (byUser && controller.running()) dismissed = true;
    if (root) leave(root);
    root = null; list = null; foot = null; count = null;
  }

  const label = (job) => {
    if (job.status === 'done') return `Listo · ${formatBytes(job.result?.size ?? job.file.size)}`;
    if (job.status === 'error') return job.error?.message ?? 'Error';
    if (job.status === 'skipped') return 'Ignorado';
    if (job.retrying) return `Reintentando (${job.attempt})…`;
    if (job.status === 'running') return job.progress >= 1 ? 'Enviando a Telegram…' : `Subiendo… ${Math.round(job.progress * 100)} %`;
    return 'En cola';
  };

  const act = (name, title, run) => h('button', { class: 'upload-act', type: 'button', title, 'aria-label': title, onclick: run }, icon(name), h('span', {}, title));

  function paint(job) {
    let row = rows.get(job);
    if (!row || !list.contains(row.el)) {
      row = { bar: h('i'), state: h('span', { class: 'state' }), name: h('div', { class: 'name' }), acts: h('div', { class: 'upload-acts' }) };
      row.el = h('div', { class: 'upload-row' }, row.name, h('div', { class: 'progress' }, row.bar), row.state, row.acts);
      rows.set(job, row);
      list.append(row.el);
    }
    const name = job.rel || job.file.name;
    row.name.textContent = name; row.name.title = name;
    row.bar.style.width = `${Math.round(job.progress * 100)}%`;
    row.state.textContent = label(job);
    row.state.title = row.state.textContent;
    const failed = job.status === 'error';
    if (failed && !row.el.classList.contains('error')) list.prepend(row.el); // los fallidos, arriba y a la vista
    row.el.classList.toggle('done', job.status === 'done');
    row.el.classList.toggle('error', failed);
    row.el.classList.toggle('skipped', job.status === 'skipped');
    fill(row.acts, ...(failed ? [
      act('refresh', 'Reintentar', () => controller.retry(job)),
      act('edit', 'Renombrar', () => controller.rename(job)),
      act('close', 'Ignorar', () => controller.skip(job)),
    ] : []));
  }

  const paintCount = (jobs) => {
    if (!count) return;
    const all = jobs ?? [];
    const done = all.filter((j) => j.status === 'done').length;
    count.textContent = all.length ? `${done}/${all.length}` : '';
  };

  return {
    /** `jobs` cambiados; `all` = todos (para el contador). Si el usuario lo cerró, solo se reabre si algo falla. */
    update(jobs, all) {
      cancelClose();
      if (!root && dismissed && !jobs.some((j) => j.status === 'error')) return;
      const fresh = !root;
      dismissed = false; ensure();
      (fresh && all ? all : jobs).forEach(paint);
      paintCount(all);
    },
    /** Resumen cuando la cola queda vacía. */
    finish({ done, failed, skipped = 0 }) {
      dismissed = false;
      if (!root) return;
      const parts = [`${done} subido${done === 1 ? '' : 's'}`];
      if (failed) parts.push(`${failed} con error`);
      if (skipped) parts.push(`${skipped} ignorado${skipped === 1 ? '' : 's'}`);
      fill(foot, h('span', { class: failed ? 'bad' : 'ok' }, failed || skipped ? parts.join(', ') : `${parts[0]} correctamente`),
        failed ? h('div', { class: 'upload-foot-acts' },
          h('button', { class: 'btn', type: 'button', onclick: () => controller.skip() }, 'Ignorar fallidos'),
          h('button', { class: 'btn btn-primary', type: 'button', onclick: () => { fill(foot); controller.retryFailed(); } }, 'Reintentar')) : null);
    },
    /** Cierra el panel pasados `ms` (si no hay errores que revisar ni subidas nuevas). */
    closeLater(ms = 2200) { cancelClose(); timer = setTimeout(() => { if (!controller.running()) close(); }, ms); },
    clearFoot: () => foot && fill(foot),
  };
}
