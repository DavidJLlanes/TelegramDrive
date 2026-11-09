// Telegram simulado en memoria con la misma interfaz que TelegramService.
import fs from 'node:fs';
import { TAG, encodeFile } from '../../server/telegram/codec.js';

export class FakeTelegram {
  /** `chats`: almacén compartido por chat (cada chat tiene sus mensajes e ids, como en Telegram). */
  constructor(chats = new Map(), chat = 'me') {
    this.chats = chats;
    this.chat = chat;
    this.connected = true;
    this.edits = 0;
    this.removeCalls = 0;
  }

  get #box() {
    const key = String(this.chat);
    if (!this.chats.has(key)) this.chats.set(key, { messages: new Map(), nextId: 1 });
    return this.chats.get(key);
  }

  get messages() { return this.#box.messages; }

  #store(message) {
    const box = this.#box;
    const m = { id: box.nextId++, date: Math.floor(Date.now() / 1000), ...message };
    box.messages.set(m.id, m);
    return m;
  }

  /** Vista sobre otro chat (mismo almacén). */
  async forChat(chat) { return Object.assign(new FakeTelegram(this.chats, String(chat)), { down: this.down }); }

  /** Copia mensajes a `target` (como el reenvío sin autor); devuelve los nuevos en el mismo orden. */
  async forwardTo(target, ids) {
    return ids.map((id) => {
      const { id: _id, ...rest } = this.messages.get(id);
      return target.#store(rest);
    });
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

  async *iterTagged({ minId = 0, tag = TAG } = {}) {
    const list = [...this.messages.values()].filter((m) => m.id > minId && m.message.startsWith(tag));
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
  async ping() { if (this.down) throw new Error('sin conexión'); }
  async disconnect() {}
}
