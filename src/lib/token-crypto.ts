import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

/**
 * Encryption at rest for the OAuth tokens stored in the Account table.
 *
 * The admin's Google refresh token grants Search Console access for as long as
 * it lives. Kept in plain text, anyone who reads the database (a leaked backup,
 * a read-only credential, a SQL bug) holds it too. With AES-256-GCM under a key
 * derived from the app's auth secret, the database alone is not enough.
 *
 * Format: "enc:v1:<iv>:<tag>:<ciphertext>", each part base64url.
 * A value without the prefix is a legacy plain-text token: it is returned as
 * is, so existing sign-ins keep working, and it is encrypted the next time it
 * is written. If the secret changes, old values no longer decrypt and read as
 * null; the admin signs in again and a fresh token is stored.
 */

const PREFIX = "enc:v1:";

function key(): Buffer | null {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!secret) return null;
  // Domain-separated from every other use of the same secret.
  return createHash("sha256").update(`z-g account-token encryption v1\0${secret}`).digest();
}

export function encryptToken(value: string | null | undefined): string | null | undefined {
  if (value === null || value === undefined || value === "") return value;
  if (value.startsWith(PREFIX)) return value;
  const k = key();
  if (!k) return value; // no secret configured (local dev): store as before
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", k, iv);
  const ct = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + [iv, tag, ct].map((b) => b.toString("base64url")).join(":");
}

export function decryptToken(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith(PREFIX)) return value; // legacy plain text
  const k = key();
  if (!k) return null;
  const [ivB, tagB, ctB] = value.slice(PREFIX.length).split(":");
  try {
    const decipher = createDecipheriv("aes-256-gcm", k, Buffer.from(ivB, "base64url"));
    decipher.setAuthTag(Buffer.from(tagB, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(ctB, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

export function isEncryptedToken(value: string | null | undefined): boolean {
  return !!value && value.startsWith(PREFIX);
}
