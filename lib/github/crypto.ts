import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * AES-256-GCM encryption for GitHub access tokens.
 *
 * Key material comes exclusively from the server-side
 * `GITHUB_TOKEN_ENCRYPTION_KEY` environment variable (base64, 32 bytes).
 * This module must only run on the server.
 */

const ALGORITHM = 'aes-256-gcm';
const KEY_ENV = 'GITHUB_TOKEN_ENCRYPTION_KEY';
const VERSION = 'v1';
const IV_BYTES = 12;
const TAG_BYTES = 16;

function getKey(): Buffer {
  const raw = process.env[KEY_ENV];
  if (!raw) {
    throw new Error(`${KEY_ENV} is not configured.`);
  }

  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error(`${KEY_ENV} must be a base64-encoded 32-byte key.`);
  }
  return key;
}

export function isEncryptionConfigured(): boolean {
  try {
    getKey();
    return true;
  } catch {
    return false;
  }
}

/** Encrypt a token into a self-describing ciphertext string. */
export function encryptToken(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString('base64'),
    tag.toString('base64'),
    ciphertext.toString('base64'),
  ].join('.');
}

/** Decrypt a ciphertext produced by `encryptToken`. Throws on tampering. */
export function decryptToken(payload: string): string {
  const key = getKey();
  const parts = payload.split('.');

  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error('Invalid token ciphertext.');
  }

  const iv = Buffer.from(parts[1], 'base64');
  const tag = Buffer.from(parts[2], 'base64');
  const ciphertext = Buffer.from(parts[3], 'base64');

  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) {
    throw new Error('Invalid token ciphertext.');
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
