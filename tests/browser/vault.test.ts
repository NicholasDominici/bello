import { copyFile, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { FileVaultStore, NativeVaultProvider } from "../../server/browser/vault/native";
import { generateTotp } from "../../server/browser/vault/totp";

// Fixed v1 vault created with a fixture-only master key of 32 bytes set to 7.
async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), "bell-vault-")),
    path = join(dir, "vault.json");
  await copyFile(new URL("./fixtures/native-vault.json", import.meta.url), path);
  return {
    path,
    vault: new NativeVaultProvider(new FileVaultStore(path), Buffer.alloc(32, 7)),
  };
}
const login = {
  label: "Demo",
  allowedHosts: ["authenticationtest.com"],
  username: "fixture-user",
  password: "fixture-password",
  totpSecret: "JBSWY3DPEHPK3PXP",
  notes: "safe note",
};
describe("Native Vault", () => {
  it("reads existing encrypted logins and exposes safe metadata only", async () => {
    const { path, vault } = await fixture();
    const [item] = await vault.list();
    expect(item).toEqual({
      provider: "native",
      itemId: "fixture-login",
      label: login.label,
      allowedHosts: login.allowedHosts,
      fields: { username: true, password: true, totp: true },
      createdAt: "2026-09-05T00:00:00.000Z",
      updatedAt: "2026-09-05T00:00:00.000Z",
    });
    const raw = await readFile(path, "utf8");
    expect(raw).not.toContain(login.username);
    expect(raw).not.toContain(login.password);
    expect(raw).not.toContain(login.totpSecret);
    expect(await Promise.all(
      (["username", "password", "totp"] as const).map((field) =>
        vault.resolve({ provider: "native", itemId: item.itemId, field }),
      ),
    )).toEqual([login.username, login.password, login.totpSecret]);
  });
  it("rejects a wrong master key", async () => {
    const { path, vault } = await fixture();
    const [item] = await vault.list();
    const wrong = new NativeVaultProvider(new FileVaultStore(path), Buffer.alloc(32, 9));
    await expect(
      wrong.resolve({
        provider: "native",
        itemId: item.itemId,
        field: "password",
      }),
    ).rejects.toThrow();
  });
  it("detects ciphertext tampering", async () => {
    const { path, vault } = await fixture();
    const [item] = await vault.list();
    const data = JSON.parse(await readFile(path, "utf8"));
    data.records[0].payload.ciphertext =
      (data.records[0].payload.ciphertext.startsWith("A") ? "B" : "A") +
      data.records[0].payload.ciphertext.slice(1);
    await writeFile(path, JSON.stringify(data), { mode: 0o600 });
    await expect(
      vault.resolve({
        provider: "native",
        itemId: item.itemId,
        field: "password",
      }),
    ).rejects.toThrow();
  });
  it("generates RFC 6238-compatible codes", () => {
    expect(generateTotp("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", 59000, 30, 8)).toBe("94287082");
  });
});
