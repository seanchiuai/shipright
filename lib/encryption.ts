import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";

export function encryptToken(token: string): string {
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, "hex");
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(token, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

export class TokenDecryptionError extends Error {
  constructor() {
    super("GitHub connection expired or invalid. Please reconnect your GitHub account.");
    this.name = "TokenDecryptionError";
  }
}

export function decryptToken(encryptedToken: string): string {
  try {
    const key = Buffer.from(process.env.ENCRYPTION_KEY!, "hex");
    const [ivHex, authTagHex, encrypted] = encryptedToken.split(":");

    if (!ivHex || !authTagHex || encrypted === undefined) {
      throw new Error("malformed token");
    }

    const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch {
    throw new TokenDecryptionError();
  }
}
