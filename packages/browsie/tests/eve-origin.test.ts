import { afterEach, expect, it, vi } from "vitest";
import channel from "../agent/channels/eve";

const password = "synthetic-operator-password-at-least-32-bytes";
const authorization = `Basic ${Buffer.from(`operator:${password}`).toString("base64")}`;
const cancel = channel.routes!.find(route => route.method === "POST" && route.path.endsWith("/:sessionId/cancel"))!;
afterEach(() => { vi.unstubAllEnvs(); });
it.each(["0", "1"])("rejects cross-origin Basic writes without falling through to dev auth (%s)", async dev => {
  vi.stubEnv("EVE_DEV", dev); vi.stubEnv("BROWSIE_STUDIO_USERNAME", "operator"); vi.stubEnv("BROWSIE_STUDIO_PASSWORD", password);
  const callback = vi.fn(async () => ({ status: "accepted", sessionId: "synthetic-session" }));
  const context = { params: { sessionId: "synthetic-session" }, attachSession: () => ({ cancel: callback }) };
  for (const origin of ["https://other.example", "null", ""]) for (const credential of [authorization, "", "Basic d3Jvbmc6d3Jvbmc="]) {
    const response = await cancel.handler(new Request("https://browsie.example/eve/v1/session/synthetic-session/cancel", {
      method: "POST", headers: { authorization: credential, origin, "sec-fetch-site": "cross-site", "content-type": "text/plain" }, body: "{}",
    }), context as never);
    if (!(response instanceof Response)) throw new Error("Expected an HTTP response.");
    expect(response.status).toBe(403);
  }
  expect(callback).not.toHaveBeenCalled();
  const response = await cancel.handler(new Request("https://browsie.example/eve/v1/session/synthetic-session/cancel", {
    method: "POST", headers: { authorization, origin: "https://browsie.example" }, body: "{}",
  }), context as never);
  if (!(response instanceof Response)) throw new Error("Expected an HTTP response.");
  expect(response.status).toBe(202); expect(callback).toHaveBeenCalledOnce();
});

it("accepts the original origin through Next's proxy and rejects a different origin", async () => {
  vi.stubEnv("BROWSIE_STUDIO_USERNAME", "operator"); vi.stubEnv("BROWSIE_STUDIO_PASSWORD", password);
  const callback = vi.fn(async () => ({ status: "accepted", sessionId: "synthetic-session" }));
  for (const [origin, status] of [["https://browsie.example", 202], ["https://other.example", 403]] as const) {
    const response = await cancel.handler(new Request("http://127.0.0.1:4274/eve/v1/session/synthetic-session/cancel", {
      method: "POST", headers: { authorization, origin, host: "127.0.0.1:4274", "x-forwarded-host": "browsie.example", "x-forwarded-proto": "https" }, body: "{}",
    }), { params: { sessionId: "synthetic-session" }, attachSession: () => ({ cancel: callback }) } as never);
    if (!(response instanceof Response)) throw new Error("Expected an HTTP response.");
    expect(response.status).toBe(status);
  }
  expect(callback).toHaveBeenCalledOnce();
});
