import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { decryptToken, encryptToken, isEncryptionConfigured } from '@/lib/github/crypto';

const KEY = Buffer.alloc(32, 7).toString('base64');

describe('GitHub token encryption', () => {
  const original = process.env.GITHUB_TOKEN_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.GITHUB_TOKEN_ENCRYPTION_KEY = KEY;
  });

  afterEach(() => {
    if (original === undefined) {
      delete process.env.GITHUB_TOKEN_ENCRYPTION_KEY;
    } else {
      process.env.GITHUB_TOKEN_ENCRYPTION_KEY = original;
    }
  });

  it('round-trips a token', () => {
    const token = 'gho_example_token_value_123';
    const ciphertext = encryptToken(token);

    expect(ciphertext).not.toContain(token);
    expect(decryptToken(ciphertext)).toBe(token);
  });

  it('uses a fresh IV so ciphertexts differ', () => {
    const token = 'gho_example_token_value_123';
    expect(encryptToken(token)).not.toBe(encryptToken(token));
  });

  it('rejects tampered ciphertext', () => {
    const ciphertext = encryptToken('gho_example_token_value_123');
    const parts = ciphertext.split('.');
    const last = parts[3];
    parts[3] = `${last.startsWith('A') ? 'B' : 'A'}${last.slice(1)}`;

    expect(() => decryptToken(parts.join('.'))).toThrow();
  });

  it('rejects malformed payloads', () => {
    expect(() => decryptToken('not-a-ciphertext')).toThrow();
    expect(() => decryptToken('v1.a.b.c')).toThrow();
  });

  it('reports whether a valid key is configured', () => {
    expect(isEncryptionConfigured()).toBe(true);

    process.env.GITHUB_TOKEN_ENCRYPTION_KEY = Buffer.alloc(16, 1).toString('base64');
    expect(isEncryptionConfigured()).toBe(false);

    delete process.env.GITHUB_TOKEN_ENCRYPTION_KEY;
    expect(isEncryptionConfigured()).toBe(false);
  });

  it('throws when encrypting without a key', () => {
    delete process.env.GITHUB_TOKEN_ENCRYPTION_KEY;
    expect(() => encryptToken('token')).toThrow();
  });
});
