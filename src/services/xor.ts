/**
 * XOR cipher — byte-by-byte with cyclic key.
 * Algorithm matches xor-number-cipher.js (yapweijun1996/XOR-Cipher-Tool).
 *
 * Number-groups format: each byte is represented as a zero-padded 3-digit decimal.
 * e.g. byte 65 → "065", concatenated: "065066067..."
 */
const enc = new TextEncoder();
const dec = new TextDecoder();

function xorBytes(bytes: Uint8Array, key: string): Uint8Array {
  const keyBytes = enc.encode(key);
  const out = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    out[i] = bytes[i] ^ keyBytes[i % keyBytes.length];
  }
  return out;
}

/** Decrypt a number-groups ciphertext (produced by XOR-Cipher-Tool). */
export function xorDecrypt(numberGroups: string, key: string): string {
  const clean = numberGroups.replace(/\s+/g, '');
  const bytes = new Uint8Array(clean.length / 3);
  for (let i = 0; i < clean.length; i += 3) {
    bytes[i / 3] = Number(clean.slice(i, i + 3));
  }
  return dec.decode(xorBytes(bytes, key));
}

/** Encrypt a plaintext string → number-groups ciphertext. */
export function xorEncrypt(message: string, key: string): string {
  const msgBytes = enc.encode(message);
  const xored = xorBytes(msgBytes, key);
  return Array.from(xored, b => String(b).padStart(3, '0')).join('');
}
