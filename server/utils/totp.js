// TOTP (RFC 6238) con HMAC-SHA1, 6 dígitos y paso de 30 s: compatible con Google Authenticator, Aegis, 1Password…
import crypto from 'node:crypto';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP = 30_000;

export function base32Encode(buffer) {
  let bits = 0; let value = 0; let out = '';
  for (const byte of buffer) {
    value = (value << 8) | byte; bits += 8;
    while (bits >= 5) { out += ALPHABET[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  return bits ? out + ALPHABET[(value << (5 - bits)) & 31] : out;
}

export function base32Decode(text) {
  let bits = 0; let value = 0; const out = [];
  for (const ch of String(text).toUpperCase().replace(/[\s=]/g, '')) {
    const i = ALPHABET.indexOf(ch);
    if (i < 0) throw new Error('Secreto TOTP no válido');
    value = (value << 5) | i; bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
}

export const newTotpSecret = () => base32Encode(crypto.randomBytes(20));

export function codeAt(secret, counter) {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', base32Decode(secret)).update(msg).digest();
  const offset = hmac[19] & 15;
  const num = ((hmac[offset] & 0x7f) << 24) | (hmac[offset + 1] << 16) | (hmac[offset + 2] << 8) | hmac[offset + 3];
  return String(num % 1_000_000).padStart(6, '0');
}

/** Devuelve el contador (paso) válido para `code` (±1 paso de tolerancia) o null. */
export function verifyTotp(secret, code, now = Date.now()) {
  const clean = String(code ?? '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(clean)) return null;
  const counter = Math.floor(now / STEP);
  for (const c of [counter, counter - 1, counter + 1]) {
    if (crypto.timingSafeEqual(Buffer.from(codeAt(secret, c)), Buffer.from(clean))) return c;
  }
  return null;
}

export const otpauthUri = (secret, account = 'djl', issuer = 'Telegram Drive') =>
  `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
