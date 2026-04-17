import { describe, it, expect } from 'vitest';

// Pure crypto logic tests using Node built-in crypto
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;
const TEST_KEY = Buffer.from('a'.repeat(64), 'hex').slice(0, 32); // 32 bytes
const HMAC_SECRET = 'test-hmac-secret-for-unit-tests!';

function encrypt(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, TEST_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, encrypted, authTag]).toString('base64');
}

function decrypt(encoded: string): string {
  const buf = Buffer.from(encoded, 'base64');
  const iv = buf.subarray(0, IV_BYTES);
  const authTag = buf.subarray(buf.length - AUTH_TAG_BYTES);
  const ciphertext = buf.subarray(IV_BYTES, buf.length - AUTH_TAG_BYTES);
  const decipher = createDecipheriv(ALGORITHM, TEST_KEY, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(ciphertext) + decipher.final('utf8');
}

function hmac(phone: string): string {
  return createHmac('sha256', HMAC_SECRET).update(phone).digest('hex');
}

describe('Phone encryption', () => {
  it('encrypts and decrypts a phone number', () => {
    const phone = '+4915112345678';
    const enc = encrypt(phone);
    expect(decrypt(enc)).toBe(phone);
  });

  it('produces different ciphertext for same input (random IV)', () => {
    const phone = '+4915112345678';
    expect(encrypt(phone)).not.toBe(encrypt(phone));
  });

  it('HMAC is deterministic for same phone', () => {
    const phone = '+4915112345678';
    expect(hmac(phone)).toBe(hmac(phone));
  });

  it('HMAC differs for different phones', () => {
    expect(hmac('+4915112345678')).not.toBe(hmac('+4915187654321'));
  });
});
