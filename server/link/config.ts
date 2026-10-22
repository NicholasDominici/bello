import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export class LinkSetupError extends Error {
  constructor(readonly reason: "missing_configuration" | "invalid_configuration" | "credentials_unreadable", readonly setting?: string) {
    super(reason === "credentials_unreadable"
      ? "Link credentials could not be decrypted. Check the server encryption key."
      : `Check ${setting} in the server configuration.`);
    this.name = "LinkSetupError";
  }
}

export interface LinkConfig {
  databaseUrl: string;
  origin: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
  publishableKey: string;
  encryptionKey: Buffer;
}

export function linkConfig(): LinkConfig {
  const required = (name: string) => {
    const value = process.env[name]?.trim();
    if (!value) throw new LinkSetupError("missing_configuration", name);
    return value;
  };
  const origin = required("BROWSIE_PUBLIC_URL");
  let url: URL;
  try { url = new URL(origin); } catch { throw new LinkSetupError("invalid_configuration", "BROWSIE_PUBLIC_URL"); }
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.origin !== origin || (url.protocol !== "https:" && !(loopback && url.protocol === "http:")))
    throw new LinkSetupError("invalid_configuration", "BROWSIE_PUBLIC_URL");
  const encodedKey = required("LINK_TOKEN_ENCRYPTION_KEY");
  const encryptionKey = Buffer.from(encodedKey, "base64");
  if (encryptionKey.length !== 32 || encryptionKey.toString("base64") !== encodedKey)
    throw new LinkSetupError("invalid_configuration", "LINK_TOKEN_ENCRYPTION_KEY");
  return {
    databaseUrl: required("DATABASE_URL"), origin,
    redirectUri: `${origin}/api/link/oauth/callback`,
    clientId: required("LINK_CLIENT_ID"), clientSecret: required("LINK_CLIENT_SECRET"),
    publishableKey: required("STRIPE_PUBLISHABLE_KEY"), encryptionKey,
  };
}

export function hash(value: string): string {
  return createHash("sha256").update(value).digest("base64url");
}

// Bind ciphertext to its purpose and owner so records cannot be swapped between users.
export function seal(value: unknown, key: Buffer, context: string): string {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  cipher.setAAD(Buffer.from(context));
  const body = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return ["v1", nonce.toString("base64url"), cipher.getAuthTag().toString("base64url"), body.toString("base64url")].join(".");
}

export function unseal<T>(value: string, key: Buffer, context: string): T {
  try {
    const [version, nonce, tag, body, extra] = value.split(".");
    if (version !== "v1" || !nonce || !tag || !body || extra !== undefined) throw new Error();
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(nonce, "base64url"));
    decipher.setAAD(Buffer.from(context));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]).toString("utf8")) as T;
  } catch {
    throw new LinkSetupError("credentials_unreadable", "LINK_TOKEN_ENCRYPTION_KEY");
  }
}
