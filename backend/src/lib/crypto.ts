import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';
import { env } from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;

function getKey(): Buffer {
  return Buffer.from(env.PHONE_ENC_KEY, 'hex');
}

/**
 * Encrypts a phone number with AES-256-GCM.
 * Returns base64-encoded: IV (12) | ciphertext | auth tag (16)
 */
export function encryptPhone(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, encrypted, authTag]).toString('base64');
}

/**
 * Decrypts a phone number encrypted with encryptPhone.
 * Returns plaintext — caller must discard immediately after use.
 */
export function decryptPhone(encoded: string): string {
  const buf = Buffer.from(encoded, 'base64');
  const iv = buf.subarray(0, IV_BYTES);
  const authTag = buf.subarray(buf.length - AUTH_TAG_BYTES);
  const ciphertext = buf.subarray(IV_BYTES, buf.length - AUTH_TAG_BYTES);
  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  return decipher.update(ciphertext) + decipher.final('utf8');
}

/**
 * HMAC-SHA256 of phone for indexed lookup without storing plaintext.
 * Phone must be in E.164 format (e.g. +4915123456789).
 */
export function hashPhone(phone: string): string {
  return createHmac('sha256', env.PHONE_HMAC_SECRET).update(phone).digest('hex');
}

/**
 * Masks a phone for display: +49 *** *** 1234
 */
export function maskPhone(e164: string): string {
  if (e164.length < 6) return '***';
  return e164.slice(0, 3) + ' *** *** ' + e164.slice(-4);
}
