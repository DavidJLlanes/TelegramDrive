// Telegram simulado en memoria con la misma interfaz que TelegramService.
import fs from 'node:fs';
import { TAG } from '../../server/telegram/codec.js';

export class FakeTelegram {
  constructor() { this.messages = new Map(); this.nextId = 1; this.connected = true; }

  async *iterTagged() {
    for (const m of [...this.messages.values()].reverse()) if (m.message.startsWith(TAG)) yield m;
  }

  async sendText(text) {
    const m = { id: this.nextId++, message: text, date: Math.floor(Date.now() / 1000) };
    this.messages.set(m.id, m);
    return m;
  }

  async sendFile({ path, name, size, caption }) {
    const m = {
      id: this.nextId++, message: caption, date: Math.floor(Date.now() / 1000), bytes: fs.readFileSync(path),
      media: { document: { size, mimeType: name.endsWith('.png') ? 'image/png' : 'audio/mpeg',
        attributes: [{ className: 'DocumentAttributeFilename', fileName: name }], thumbs: [] } },
    };
    this.messages.set(m.id, m);
    return m;
  }

  async editText(id, text) { this.messages.get(id).message = text; }
  async remove(ids) { ids.forEach((id) => this.messages.delete(id)); }
  async getMessage(id) { return this.messages.get(id); }
  async *readRange(message, start, end) { yield message.bytes.subarray(start, end + 1); }
  async downloadThumb() { return null; }
  async disconnect() {}
}
