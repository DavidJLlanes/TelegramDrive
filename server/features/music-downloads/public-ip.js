import dns from 'node:dns/promises';
import net from 'node:net';

function publicV4(value) {
  const n = value.split('.').map(Number);
  if (n.length !== 4 || n.some((v) => !Number.isInteger(v) || v < 0 || v > 255)) return false;
  const [a, b, c] = n;
  if (a === 0 || a === 10 || a === 127 || a >= 224 || a === 169 && b === 254 ||
      a === 172 && b >= 16 && b <= 31 || a === 192 && b === 168 ||
      a === 100 && b >= 64 && b <= 127 || a === 192 && b === 0 ||
      a === 192 && b === 88 && c === 99 || a === 198 && (b === 18 || b === 19) ||
      a === 198 && b === 51 && c === 100 || a === 203 && b === 0 && c === 113 ||
      a === 192 && b === 0 && c === 2) return false;
  return true;
}

export function isPublicIp(ip) {
  return net.isIP(ip) === 4 && publicV4(ip);
}

/** Only public IPv4 is permitted; pin the resolved address in the TLS request. */
export async function publicAddress(hostname) {
  if (net.isIP(hostname)) throw new Error('No se admiten direcciones IP directas');
  const records = await dns.lookup(hostname, { all: true, verbatim: true });
  if (!records.length || records.some((r) => !isPublicIp(r.address))) {
    throw new Error('El dominio apunta a una red privada o no permitida');
  }
  const record = records.find((r) => r.family === 4);
  if (!record) throw new Error('No se encontró una dirección IPv4 pública');
  return record.address;
}
