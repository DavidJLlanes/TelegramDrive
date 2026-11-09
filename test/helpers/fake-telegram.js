// Telegram simulado en memoria con la misma interfaz que TelegramService.
import fs from 'node:fs';
import { TAG, encodeFile } from '../../server/telegram/codec.js';

export class FakeTelegram {
  constructor() {
    this.messages = new Map();
    this.nextId = 1;
    this.connected = true;
    this.edits = 0;
    this.removeCalls = 0;
  }

  #store(message) {
    const m = { id: this.nextId++, date: Math.floor(Date.now() / 1000), ...message };
    this.messages.set(m.id, m);
    return m;
  }

  static media(name, size, bytes) {
    return {
      document: {
        size, mimeType: name.endsWith('.png') ? 'image/png' : 'audio/mpeg',
        attributes: [{ className: 'DocumentAttributeFilename', fileName: name }], thumbs: [], bytes,
      },
    };
  }

  /** Inserta un archivo "desde fuera" (como si se hubiera subido desde otro cliente). */
  addFile({ folder, name, size = 10, bytes = Buffer.alloc(size, 1) }) {
    return this.#store({ message: encodeFile({ folder, name }), media: FakeTelegram.media(name, bytes.length, bytes) });
  }

  async *iterTagged({ minId = 0 } = {}) {
    const list = [...this.messages.values()].filter((m) => m.id > minId && m.message.startsWith(TAG));
    for (const m of list.sort((a, b) => b.id - a.id)) yield m;
  }

  async sendText(text) { return this.#store({ message: text }); }

  async sendFile({ path, name, size, caption }) {
    const bytes = fs.readFileSync(path);
    return this.#store({ message: caption, media: FakeTelegram.media(name, size, bytes), bytes });
  }

  async editText(id, text) { this.edits += 1; this.messages.get(id).message = text; }
  async remove(ids) { this.removeCalls += 1; ids.forEach((id) => this.messages.delete(id)); }
  async getMessage(id) { return this.messages.get(id); }
  async *readRange(message, start, end) { yield message.media.document.bytes.subarray(start, end + 1); }
  async downloadThumb() { return null; }
  async disconnect() {}
}
