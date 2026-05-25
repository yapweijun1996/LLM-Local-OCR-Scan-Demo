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

  // Validate format BEFORE parsing — silent truncation or NaN coercion would
  // produce a corrupted key that fails authentication with no clear diagnosis.
  if (clean.length === 0) {
    throw new Error('xorDecrypt: empty input');
  }
  if (clean.length % 3 !== 0) {
    throw new Error(`xorDecrypt: input length ${clean.length} is not a multiple of 3 — corrupted number-groups payload`);
  }
  if (!/^\d+$/.test(clean)) {
    throw new Error('xorDecrypt: input contains non-digit characters — expected a number-groups ciphertext');
  }

  const bytes = new Uint8Array(clean.length / 3);
  for (let i = 0; i < clean.length; i += 3) {
    const byte = Number(clean.slice(i, i + 3));
    if (byte > 255) {
      throw new Error(`xorDecrypt: byte value ${byte} at position ${i} exceeds 255 — invalid payload`);
    }
    bytes[i / 3] = byte;
  }
  return dec.decode(xorBytes(bytes, key));
}

/** Encrypt a plaintext string → number-groups ciphertext. */
export function xorEncrypt(message: string, key: string): string {
  const msgBytes = enc.encode(message);
  const xored = xorBytes(msgBytes, key);
  return Array.from(xored, b => String(b).padStart(3, '0')).join('');
}
