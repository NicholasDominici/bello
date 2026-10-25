import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { issueContextCapability, requireContextCapability } from "../server/context-capability";
import { activeBrowserSession } from "../server/agent-live-view";
import type { MessageStreamEvent } from "eve/client";
import { studioAccess, studioAuth } from "../../../server/browser/studio-auth";

const mocks = vi.hoisted(() => ({ debug: vi.fn(), snapshot: vi.fn(), getSession: vi.fn(), getLiveView: vi.fn(), status: vi.fn(), list: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() }));
vi.mock("eve/client", () => ({ Client: class { sessions = { attach: () => ({ snapshot: mocks.snapshot }) }; } }));
vi.mock("@browserbasehq/sdk", () => ({ default: class { sessions = { debug: mocks.debug }; } }));
vi.mock("../server/context-studio", () => ({ getContextStudio: () => mocks }));
vi.mock("../../../server/browser/vault/index", () => ({ nativeVault: mocks, onePasswordVault: mocks }));
import * as vault from "../app/api/vault/native/route";
import { GET as onePassword } from "../app/api/vault/onepassword/route";
import { GET as liveView } from "../app/api/browser-live-view/route";

const password = "synthetic-operator-password-at-least-32-bytes";
const secret = "synthetic-handoff-secret-at-least-32-bytes";
const origin = "https://browsie.example";
const authorization = `Basic ${Buffer.from(`operator:${password}`).toString("base64")}`;
const sessionId = "synthetic-browser-session";
const liveUrl = "https://www.browserbase.com/devtools-fullscreen/inspector.html?wss=connect.browserbase.com%2Fdebug%2Fsynthetic";
const login = { itemId: "synthetic-item", label: "Fixture", allowedHosts: ["shop.example"], username: "fixture", password: "synthetic-only" };
function request(path: string, init: RequestInit = {}) {
  return new Request(`${origin}${path}`, { ...init, headers: { authorization, origin, ...init.headers } });
}
function liveRequest(eveSessionId?: string, capability = issueContextCapability(request("/api/context-capability", { method: "POST" })).token) {
  return request(`/api/browser-live-view?sessionId=${sessionId}${eveSessionId ? `&eveSessionId=${eveSessionId}` : ""}`, { headers: {
    "x-browsie-context-capability": capability,
  } });
}
beforeEach(() => {
  vi.stubEnv("BROWSIE_STUDIO_USERNAME", "operator"); vi.stubEnv("BROWSIE_STUDIO_PASSWORD", password);
  vi.stubEnv("BROWSIE_HANDOFF_SECRET", secret); vi.stubEnv("BROWSERBASE_API_KEY", "synthetic-key");
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.resetAllMocks(); vi.useRealTimers(); });

describe("standalone operator boundary", () => {
  it.each(["", "short"])("fails closed with an absent or weak operator password", value => {
    vi.stubEnv("BROWSIE_STUDIO_PASSWORD", value);
    expect(studioAccess(request("/"))?.status).toBe(503);
    expect(studioAuth(request("/"))).toBeNull();
  });
  it("challenges unauthenticated users and accepts the configured operator", () => {
    const denied = studioAccess(new Request(origin));
    expect(denied?.status).toBe(401); expect(denied?.headers.get("www-authenticate")).toContain("Basic");
    expect(studioAccess(request("/"))).toBeUndefined();
    expect(studioAuth(request("/"))).not.toBeNull();
  });
  it("rejects cross-origin writes even with an authenticated operator", () => {
    expect(studioAccess(request("/api/vault/native", { method: "POST", headers: { origin: "https://other.example", "sec-fetch-site": "same-origin" } }))?.status).toBe(403);
  });
  it("rejects every unauthenticated vault operation before accessing storage", async () => {
    const body = JSON.stringify(login);
    for (const [method, handler] of [["GET", vault.GET], ["POST", vault.POST], ["PUT", vault.PUT], ["DELETE", vault.DELETE]] as const) {
      const response = await handler(new Request(`${origin}/api/vault/native?itemId=synthetic-item`, { method, ...(method === "POST" || method === "PUT" ? { body } : {}) }));
      expect(response.status).toBe(401);
    }
    expect((await onePassword(new Request(`${origin}/api/vault/onepassword`))).status).toBe(401);
    for (const name of ["status", "list", "create", "update", "delete"] as const) expect(mocks[name]).not.toHaveBeenCalled();
  });
  it("preserves authenticated same-origin vault operations", async () => {
    mocks.status.mockResolvedValue({ healthy: true }); mocks.list.mockResolvedValue([]);
    mocks.create.mockResolvedValue({ itemId: login.itemId }); mocks.update.mockResolvedValue({ itemId: login.itemId });
    expect((await vault.GET(request("/api/vault/native"))).status).toBe(200);
    expect((await vault.POST(request("/api/vault/native", { method: "POST", body: JSON.stringify(login) }))).status).toBe(201);
    expect((await vault.PUT(request("/api/vault/native", { method: "PUT", body: JSON.stringify(login) }))).status).toBe(200);
    expect((await vault.DELETE(request("/api/vault/native?itemId=synthetic-item", { method: "DELETE" }))).status).toBe(200);
  });
});

describe("signed management capabilities", () => {
  it("rejects caller-chosen matching cookie and header values", () => {
    expect(() => requireContextCapability(request("/api/contexts", { headers: { cookie: "browsie_context_capability=chosen", "x-browsie-context-capability": "chosen" } }))).toThrow();
  });
  it("accepts issued tokens and rejects tampering, expiration and credential rotation", () => {
    const token = issueContextCapability(request("/api/context-capability", { method: "POST" })).token;
    expect(() => requireContextCapability(liveRequest(undefined, token))).not.toThrow();
    const last = token.at(-1) === "A" ? "B" : "A";
    expect(() => requireContextCapability(liveRequest(undefined, token.slice(0, -1) + last))).toThrow();
    vi.stubEnv("BROWSIE_STUDIO_USERNAME", "another-operator");
    expect(() => requireContextCapability(liveRequest(undefined, token))).toThrow();
    vi.stubEnv("BROWSIE_STUDIO_USERNAME", "operator");
    vi.useFakeTimers(); vi.setSystemTime(Date.now() + 6 * 60 * 60 * 1_000 + 1);
    expect(() => requireContextCapability(liveRequest(undefined, token))).toThrow();
  });
  it("does not issue a token without operator authentication", () => {
    expect(() => issueContextCapability(new Request(`${origin}/api/context-capability`, { method: "POST", headers: { origin } }))).toThrow();
  });
});

describe("Live View session scope", () => {
  it("never looks up arbitrary sessions under the configured Browserbase key", async () => {
    expect((await liveView(liveRequest())).status).toBe(404);
    expect(mocks.debug).not.toHaveBeenCalled();
  });
  it("checks persisted task ownership before looking up a browser", async () => {
    for (const events of [[], [browserEvent("foreign-session")], [browserEvent(sessionId), { type: "turn.cancelled" }], [browserEvent(sessionId), browserEvent("new-browser-session")]]) {
      mocks.snapshot.mockResolvedValue({ events });
      expect((await liveView(liveRequest("synthetic-conversation"))).status).toBe(404);
    }
    mocks.snapshot.mockRejectedValue(new Error("History unavailable"));
    expect((await liveView(liveRequest("synthetic-conversation"))).status).toBe(404);
    expect(mocks.debug).not.toHaveBeenCalled();
  });
  it("reopens a persisted active session after ten minutes and preserves Context Studio access", async () => {
    const now = Date.now();
    mocks.snapshot.mockResolvedValue({ events: [browserEvent(sessionId)] });
    mocks.debug.mockResolvedValue({ debuggerFullscreenUrl: liveUrl });
    expect((await liveView(liveRequest("synthetic-conversation"))).status).toBe(200);
    vi.spyOn(Date, "now").mockReturnValue(now + 11 * 60_000);
    expect((await liveView(liveRequest("synthetic-conversation"))).status).toBe(200);
    expect(mocks.debug).toHaveBeenCalledTimes(2);
    mocks.getSession.mockReturnValue({ sessionId }); mocks.getLiveView.mockResolvedValue(liveUrl);
    expect((await liveView(liveRequest())).status).toBe(200);
    expect(mocks.debug).toHaveBeenCalledTimes(2);
  });
  it("ignores messages and failed tool results and rejects retired task browsers", () => {
    for (const terminal of ["turn.cancelled", "session.failed", "session.completed"]) {
      expect(activeBrowserSession([browserEvent(sessionId), { type: terminal } as MessageStreamEvent])).toBeUndefined();
    }
    const failed = browserEvent("foreign-session");
    if (failed.type === "action.result" && failed.data.result.kind === "tool-result") failed.data.result.isError = true;
    expect(activeBrowserSession([browserEvent(sessionId), failed])).toBe(sessionId);
    expect(activeBrowserSession([{ type: "message.received", data: { result: browserEvent(sessionId).data } } as unknown as MessageStreamEvent])).toBeUndefined();
  });
});
function browserEvent(id: string): MessageStreamEvent {
  return { type: "action.result", data: { result: { kind: "tool-result", output: { workbench: { browser: { provider: "browserbase", status: "active", sessionId: id } } } } } } as unknown as MessageStreamEvent;
}
