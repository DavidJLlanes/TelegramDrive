/** Cola de exclusión mutua: serializa operaciones que comprueban y luego modifican. */
export class Mutex {
  #tail = Promise.resolve();

  run(fn) {
    const result = this.#tail.then(fn, fn);
    this.#tail = result.catch(() => {});
    return result;
  }
}
