/** Production launch must use the port actually baked into Next's agent proxy. */
import { describe, expect, it } from "vitest";
import { productionAgentPort, productionWebPort } from "../scripts/lib/start-config";
const manifest = (destination: string) => ({ rewrites: { beforeFiles: [{ source: "/eve/v1/:path+", destination }] } });

describe("production launcher configuration", () => {
  it("uses the built local agent port", () => {
    expect(productionAgentPort(manifest("http://127.0.0.1:4274/eve/v1/:path+"))).toBe(4274);
    expect(productionAgentPort(manifest("http://127.0.0.1:4999/eve/v1/:path+"))).toBe(4999);
  });
  it("rejects missing builds and unexpected remote or credential-bearing destinations", () => {
    expect(() => productionAgentPort({})).toThrow("Run pnpm build");
    for (const destination of ["https://example.com/eve/v1/:path+", "http://user:secret@127.0.0.1:4274/eve/v1/:path+"])
      expect(() => productionAgentPort(manifest(destination))).toThrow("local agent proxy");
  });
  it("validates the web port before launching either process", () => {
    expect(productionWebPort(undefined)).toBe(4320);
    expect(productionWebPort("4998")).toBe(4998);
    for (const value of ["0", "-1", "65536", "4320abc", "", "4.5", "04320"])
      expect(() => productionWebPort(value)).toThrow("PORT");
  });
});
