import { createDecipheriv } from "node:crypto";
import { readFile } from "node:fs/promises";

import type {
  SafeLoginItem,
  SecretRef,
  VaultProvider,
  VaultProviderStatus,
} from "./types";

type Box = { iv: string; tag: string; ciphertext: string };
type Stored = {
  version: 1;
  id: string;
  label: string;
  allowedHosts: string[];
  hasTotp: boolean;
  createdAt: string;
  updatedAt: string;
  keyId: string;
  wrappedKey: Box;
  payload: Box;
};
type Payload = {
  username: string;
  password: string;
  totpSecret?: string;
  notes?: string;
};
interface VaultStore {
  read(): Promise<Stored[]>;
}
export class FileVaultStore implements VaultStore {
  constructor(private path = process.env.BROWSIE_VAULT_FILE ?? ".browsie/vault.enc.json") {}
  async read() {
    try {
      const value = JSON.parse(await readFile(this.path, "utf8"));
      return Array.isArray(value?.records) ? value.records : [];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }
}
export class NativeVaultProvider implements VaultProvider {
  constructor(
    private store: VaultStore = new FileVaultStore(),
    private masterKey = readMasterKey(),
  ) {}
  async status(): Promise<VaultProviderStatus> {
    return {
      provider: "native",
      configured: Boolean(this.masterKey),
      healthy: Boolean(this.masterKey),
      mode: "local-encrypted",
      message: this.masterKey
        ? "Encrypted local demo Vault ready."
        : "Set BROWSIE_VAULT_MASTER_KEY to a 32-byte base64 or 64-character hex key.",
    };
  }
  async list() {
    return (await this.store.read()).map(toSafe);
  }
  async resolve(ref: SecretRef) {
    if (ref.provider !== "native") throw new Error("Provider mismatch.");
    const record = (await this.store.read()).find((x) => x.id === ref.itemId);
    if (!record) throw new Error("Vault item not found.");
    const payload = this.decrypt(record);
    const value = ref.field === "totp" ? payload.totpSecret : payload[ref.field];
    if (!value) throw new Error("Vault field unavailable.");
    return value;
  }
  private decrypt(record: Stored): Payload {
    const master = requireKey(this.masterKey),
      key = openBox(master, record.wrappedKey);
    return JSON.parse(openBox(key, record.payload).toString("utf8"));
  }
}
function openBox(key: Buffer, box: Box) {
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(box.iv, "base64"));
  decipher.setAuthTag(Buffer.from(box.tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(box.ciphertext, "base64")), decipher.final()]);
}
function readMasterKey() {
  const value = process.env.BROWSIE_VAULT_MASTER_KEY?.trim();
  if (!value) return;
  const key = /^[a-f0-9]{64}$/i.test(value)
    ? Buffer.from(value, "hex")
    : Buffer.from(value, "base64");
  return key.length === 32 ? key : undefined;
}
function requireKey(key?: Buffer) {
  if (!key) throw new Error("Vault master key is not configured.");
  return key;
}
function toSafe(record: Stored): SafeLoginItem {
  const fields = {
    username: true,
    password: true,
    totp: Boolean(record.hasTotp),
  };
  return {
    provider: "native",
    itemId: record.id,
    label: record.label,
    allowedHosts: record.allowedHosts,
    fields,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}
