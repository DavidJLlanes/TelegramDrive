/** Acciones sobre varios elementos a la vez (selección múltiple). Cada elemento va por separado: un fallo no cancela el resto. */
export class Bulk {
  constructor({ fileOps, folderOps, trash }) { Object.assign(this, { fileOps, folderOps, trash }); }

  async run({ action, files = [], folders = [], parent }) {
    const failed = [];
    let done = 0;
    const attempt = async (label, fn) => {
      try { await fn(); done += 1; } catch (err) { failed.push({ item: label, error: err.message }); }
    };
    for (const id of files) {
      if (action === 'trash') await attempt(id, () => this.trash.trashFile(id));
      else if (action === 'move') await attempt(id, () => this.fileOps.move(id, parent));
    }
    for (const path of folders) {
      if (action === 'trash') await attempt(path, () => this.trash.trashFolder(path));
      else if (action === 'move') await attempt(path, () => this.folderOps.move(path, parent));
    }
    return { done, failed };
  }
}
