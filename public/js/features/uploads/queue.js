// Cola de subidas: concurrencia limitada y reintentos con espera creciente. Sin DOM ni red: recibe `run(job, onProgress)`.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** ¿Merece la pena reintentar? Cortes de red y errores del servidor sí; rechazos (4xx) y cancelaciones no. */
export const isRetryable = (err) => {
  if (err?.message === 'Subida cancelada') return false;
  return err?.status === 0 || err?.status >= 500;
};

export class UploadQueue {
  constructor({ run, concurrency = 3, retries = 2, wait = (n) => sleep(1500 * n), onChange = () => {}, onIdle = () => {} }) {
    Object.assign(this, { run, concurrency, retries, wait, onChange, onIdle });
    this.jobs = [];
    this.active = 0;
  }

  /** Añade trabajos { file, rel, base }; devuelve los creados. */
  add(items) {
    const created = items.map((item) => ({ ...item, status: 'queued', progress: 0, attempt: 0, error: null, result: null }));
    this.jobs.push(...created);
    this.onChange(created);
    this.#pump();
    return created;
  }

  get running() { return this.active > 0 || this.jobs.some((j) => j.status === 'queued'); }

  summary() {
    const count = (s) => this.jobs.filter((j) => j.status === s).length;
    return { total: this.jobs.length, done: count('done'), failed: count('error'), pending: count('queued') + count('running'), failures: this.jobs.filter((j) => j.status === 'error') };
  }

  /** Pone los fallidos otra vez en cola. */
  retryFailed() {
    const failed = this.jobs.filter((j) => j.status === 'error');
    failed.forEach((j) => Object.assign(j, { status: 'queued', error: null, progress: 0, attempt: 0 }));
    this.onChange(failed);
    this.#pump();
    return failed.length;
  }

  /** Vacía lo ya terminado para empezar de cero. */
  reset() { if (!this.running) this.jobs = []; }

  #pump() {
    while (this.active < this.concurrency) {
      const job = this.jobs.find((j) => j.status === 'queued');
      if (!job) break;
      job.status = 'running';
      this.active += 1;
      this.#execute(job).finally(() => {
        this.active -= 1;
        this.#pump();
        if (!this.running) this.onIdle(this.summary());
      });
    }
  }

  async #execute(job) {
    this.onChange([job]);
    for (;;) {
      try {
        job.result = await this.run(job, (p) => { job.progress = p; this.onChange([job]); });
        job.status = 'done'; job.progress = 1;
        break;
      } catch (err) {
        job.attempt += 1;
        if (!isRetryable(err) || job.attempt > this.retries) { job.status = 'error'; job.error = err; break; }
        job.retrying = true; job.progress = 0;
        this.onChange([job]);
        await this.wait(job.attempt);
        job.retrying = false;
      }
    }
    this.onChange([job]);
  }
}
