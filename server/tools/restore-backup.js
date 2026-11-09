// Lectura de una copia de seguridad (.tgb): descifra, desempaqueta y escribe los archivos en un directorio.
import fs from 'node:fs';
import path from 'node:path';
import { decrypt } from '../features/backup/cipher.js';
import { unpack } from '../features/backup/container.js';

/** Escribe los archivos de la copia en `outDir` (nunca sobrescribe: si existe, falla). Devuelve la lista. */
export function restoreBackup({ blob, passphrase, outDir }) {
  const { meta, files } = unpack(decrypt(blob, passphrase));
  fs.mkdirSync(outDir, { recursive: true, mode: 0o700 });
  for (const f of files) {
    const dest = path.join(outDir, path.basename(f.name)); // basename: una copia manipulada no puede escribir fuera del directorio
    if (fs.existsSync(dest)) throw new Error(`${dest} ya existe; elige otro directorio con --out`);
    fs.writeFileSync(dest, f.data, { mode: 0o600 });
  }
  return { createdAt: meta.createdAt, files: files.map((f) => ({ name: f.name, size: f.data.length })) };
}
