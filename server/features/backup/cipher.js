// Cifrado de copias: scrypt (clave desde la frase) + AES-256-GCM (confidencialidad e integridad).
// Formato: "TGB" 0x01 | salt(16) | iv(12) | tag(16) | datos cifrados.
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

const MAGIC = Buffer.from([0x54, 0x47, 0x42, 0x01]);
const SCRYPT = { N: 1 << 15, r: 8, p: 1, maxmem: 128 * 1024 * 1024 };
const key = (passphrase, salt) => scryptSync(String(passphrase), salt, 32, SCRYPT);

export function encrypt(data, passphrase) {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(passphrase, salt), iv);
  const body = Buffer.concat([cipher.update(data), cipher.final()]);
  return Buffer.concat([MAGIC, salt, iv, cipher.getAuthTag(), body]);
}

export function decrypt(blob, passphrase) {
  if (blob.length < 48 || !blob.subarray(0, 4).equals(MAGIC)) throw new Error('No es una copia de seguridad de Telegram Drive');
  const salt = blob.subarray(4, 20);
  const iv = blob.subarray(20, 32);
  const tag = blob.subarray(32, 48);
  try {
    const decipher = createDecipheriv('aes-256-gcm', key(passphrase, salt), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(blob.subarray(48)), decipher.final()]);
  } catch {
    throw new Error('Frase incorrecta o copia dañada');
  }
}
