import { describe, it, expect, beforeAll } from "vitest";
import { encryptToken, decryptToken } from "./encryption";

// 32-byte hex key for testing (64 hex chars)
const TEST_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

beforeAll(() => {
  process.env.ENCRYPTION_KEY = TEST_KEY;
});

describe("encryption", () => {
  it("round-trips encrypt and decrypt", () => {
    const token = "ghp_abc123xyz";
    const encrypted = encryptToken(token);
    const decrypted = decryptToken(encrypted);
    expect(decrypted).toBe(token);
  });

  it("produces different ciphertext each call (random IV)", () => {
    const token = "same-token";
    const a = encryptToken(token);
    const b = encryptToken(token);
    expect(a).not.toBe(b);
    // Both should still decrypt to the same value
    expect(decryptToken(a)).toBe(token);
    expect(decryptToken(b)).toBe(token);
  });

  it("outputs iv:authTag:encrypted format", () => {
    const encrypted = encryptToken("test");
    const parts = encrypted.split(":");
    expect(parts).toHaveLength(3);
    // IV is 16 bytes = 32 hex chars
    expect(parts[0]).toHaveLength(32);
    // Auth tag is 16 bytes = 32 hex chars
    expect(parts[1]).toHaveLength(32);
    // Encrypted portion should be non-empty
    expect(parts[2].length).toBeGreaterThan(0);
  });

  it("throws on tampered ciphertext", () => {
    const encrypted = encryptToken("secret");
    const parts = encrypted.split(":");
    // Tamper with the encrypted data
    const tampered = `${parts[0]}:${parts[1]}:ff${parts[2].slice(2)}`;
    expect(() => decryptToken(tampered)).toThrow();
  });

  it("handles special characters", () => {
    const token = "gh_token/with+special=chars&more!@#$%^*()";
    const encrypted = encryptToken(token);
    expect(decryptToken(encrypted)).toBe(token);
  });

  it("handles empty string", () => {
    const encrypted = encryptToken("");
    expect(decryptToken(encrypted)).toBe("");
  });
});
