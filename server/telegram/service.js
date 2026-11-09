import fs from 'node:fs';
import bigInt from 'big-integer';
import telegram from 'telegram';
import sessions from 'telegram/sessions/index.js';
import { CustomFile } from 'telegram/client/uploads.js';
import { TAG } from './codec.js';
import { config } from '../config/index.js';
import { HttpError } from '../utils/errors.js';

const { TelegramClient, Api } = telegram;
const { StringSession } = sessions;
const CHUNK = 512 * 1024;
const MESSAGE_TTL = 10 * 60 * 1000;

/** Envoltorio fino sobre GramJS: todo el contacto con MTProto vive aquí. */
export class TelegramService {
  constructor() {
    this.client = null;
    this.chat = TelegramService.parseChat(config.telegram.chat);
    this.messageCache = new Map();
  }

  /** "me", "@usuario" o el ID numérico de un grupo o canal (-100…). */
  static parseChat(value) {
    const chat = String(value).trim();
    return /^-?\d+$/.test(chat) ? Number(chat) : chat;
  }

  static readSession() {
    return fs.existsSync(config.sessionFile) ? fs.readFileSync(config.sessionFile, 'utf8').trim() : '';
  }

  async connect() {
    const session = TelegramService.readSession();
    if (!session) throw new Error('No hay sesión de Telegram. Ejecuta "npm run login".');
    this.client = new TelegramClient(
      new StringSession(session),
      config.telegram.apiId,
      config.telegram.apiHash,
      { connectionRetries: 10, requestRetries: 5, autoReconnect: true },
    );
    this.client.setLogLevel('error');
    await this.client.connect();
    if (!(await this.client.checkAuthorization())) {
      throw new Error('La sesión de Telegram ya no es válida. Ejecuta "npm run login".');
    }
    await this.#prepare(this.chat, 'TG_CHAT');
  }

  /** GramJS solo reconoce un grupo por su ID si ya conoce el chat: se cargan los diálogos una vez. */
  async #prepare(chat, label) {
    if (typeof chat !== 'number') return;
    await this.client.getDialogs({ limit: 500 });
    await this.client.getInputEntity(chat).catch(() => {
      throw new Error(`${label}=${chat}: no encuentro ese grupo en tu cuenta. Revisa el ID con "npm run chats".`);
    });
  }

  /** Vista del mismo cliente sobre otro chat (copias de seguridad, migración): mismos métodos, otro destino. */
  async forChat(chat, label = 'chat') {
    const target = TelegramService.parseChat(chat);
    await this.#prepare(target, label);
    const view = Object.create(this);
    view.chat = target;
    view.messageCache = new Map();
    return view;
  }

  /** Copia mensajes (con su archivo y pie) a la vista `target`, sin marca de reenviado. Devuelve los nuevos, en el mismo orden. */
  async forwardTo(target, ids) {
    const out = [];
    for (let i = 0; i < ids.length; i += 100) {
      const sent = await this.client.forwardMessages(target.chat, { messages: ids.slice(i, i + 100), fromPeer: this.chat, dropAuthor: true });
      out.push(...[sent].flat());
    }
    return out;
  }

  /** Comprobación ligera de conexión y sesión (para el control de salud). */
  async ping() {
    if (!this.client?.connected) await this.client?.connect();
    await this.client.getMe();
  }

  get connected() {
    return Boolean(this.client?.connected);
  }

  /** Mensajes etiquetados, del más nuevo al más antiguo. `minId` > 0 limita a los posteriores (sync incremental). */
  async *iterTagged({ minId = 0, tag = TAG } = {}) {
    for await (const message of this.client.iterMessages(this.chat, { search: tag, minId })) yield message;
  }

  sendText(text) {
    return this.client.sendMessage(this.chat, { message: text });
  }

  async sendFile({ path, name, size, caption, onProgress }) {
    return this.client.sendFile(this.chat, {
      file: new CustomFile(name, size, path),
      caption,
      forceDocument: true,
      workers: 4,
      progressCallback: onProgress ? (p) => onProgress(Number(p)) : undefined,
    });
  }

  async editText(id, text) {
    await this.client.editMessage(this.chat, { message: id, text });
    this.messageCache.delete(id);
  }

  async remove(ids) {
    for (let i = 0; i < ids.length; i += 100) {
      await this.client.deleteMessages(this.chat, ids.slice(i, i + 100), { revoke: true });
    }
    ids.forEach((id) => this.messageCache.delete(id));
  }

  async getMessage(id) {
    const hit = this.messageCache.get(id);
    if (hit && Date.now() - hit.at < MESSAGE_TTL) return hit.message;
    const [message] = await this.client.getMessages(this.chat, { ids: [id] });
    if (!message?.media) throw new HttpError(404, 'El archivo ya no existe en Telegram');
    this.messageCache.set(id, { message, at: Date.now() });
    return message;
  }

  /** Itera bytes [start, end] del documento, alineando las peticiones a 512 KB. */
  async *readRange(message, start, end) {
    const size = Number(message.media.document.size);
    const aligned = start - (start % CHUNK);
    const iterator = this.client.iterDownload({
      file: message.media,
      offset: bigInt(aligned),
      requestSize: CHUNK,
      fileSize: bigInt(size),
      limit: Math.ceil((end + 1 - aligned) / CHUNK),
    });
    let position = aligned;
    try {
      for await (const chunk of iterator) {
        const from = Math.max(start - position, 0);
        const to = Math.min(end + 1 - position, chunk.length);
        if (to > from) yield chunk.subarray(from, to);
        position += chunk.length;
        if (position > end) break;
      }
    } finally {
      await iterator.return?.();
    }
  }

  async downloadThumb(message) {
    const thumbs = message.media?.document?.thumbs;
    if (!thumbs?.length) return null;
    const sized = thumbs.filter((t) => t instanceof Api.PhotoSize);
    const thumb = sized.length ? sized[sized.length - 1] : thumbs[thumbs.length - 1];
    const data = await this.client.downloadMedia(message, { thumb });
    return Buffer.isBuffer(data) ? data : null;
  }

  async disconnect() {
    await this.client?.disconnect();
  }
}
