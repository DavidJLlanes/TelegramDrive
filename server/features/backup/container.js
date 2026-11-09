// Contenedor mínimo de archivos con nombre: [4 bytes: largo de la cabecera] [cabecera JSON] [bytes de cada archivo en orden].
import { gunzipSync, gzipSync } from 'node:zlib';

export function pack(files, meta = {}) {
  const header = Buffer.from(JSON.stringify({ ...meta, files: files.map((f) => ({ name: f.name, size: f.data.length })) }));
  const len = Buffer.alloc(4);
  len.writeUInt32BE(header.length);
  return gzipSync(Buffer.concat([len, header, ...files.map((f) => f.data)]), { level: 6 });
}

export function unpack(buffer) {
  const raw = gunzipSync(buffer);
  const headerLen = raw.readUInt32BE(0);
  const header = JSON.parse(raw.subarray(4, 4 + headerLen).toString('utf8'));
  let offset = 4 + headerLen;
  const files = header.files.map((f) => {
    const data = raw.subarray(offset, offset + f.size);
    offset += f.size;
    return { name: f.name, data };
  });
  const { files: _skip, ...meta } = header;
  return { meta, files };
}
