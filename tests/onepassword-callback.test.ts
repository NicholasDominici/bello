import { randomBytes } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { beginOAuth, completeOAuth, redirectUri } from "../server/onepassword/oauth";

const origin = "https://bell-stack.vercel.app";

beforeEach(() => {
  vi.stubEnv("ONEPASSWORD_CLIENT_ID", "synthetic-client");
  vi.stubEnv("ONEPASSWORD_CLIENT_SECRET", "synthetic-secret");
  vi.stubEnv("ONEPASSWORD_OAUTH_STATE_SECRET", randomBytes(32).toString("base64"));
  vi.stubEnv("ONEPASSWORD_REDIRECT_URI", `${origin}/api/onepassword/callback`);
});

describe("clean 1Password callback", () => {
  it("rejects query parameters and fragments in the registered redirect", () => {
    vi.stubEnv("ONEPASSWORD_REDIRECT_URI", `${origin}/api/onepassword/callback?bypass=1`);
    expect(() => redirectUri()).toThrow();
    vi.stubEnv("ONEPASSWORD_REDIRECT_URI", `${origin}/api/onepassword/callback#fragment`);
    expect(() => redirectUri()).toThrow();
  });

  it("starts production OAuth with PKCE and a secure state cookie", () => {
    const response = beginOAuth();
    expect(response.status).toBe(302);
    const location = new URL(response.headers.get("location")!);
    expect(location.origin).toBe("https://my.1password.com");
    expect(location.searchParams.get("redirect_uri")).toBe(`${origin}/api/onepassword/callback`);
    expect(location.searchParams.get("code_challenge_method")).toBe("S256");
    expect(location.searchParams.get("code_challenge")).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(response.headers.get("set-cookie")).toMatch(/HttpOnly; Secure; SameSite=Lax/);
    expect(response.headers.get("location")).not.toContain("synthetic-secret");
  });

  it("rejects a callback state mismatch before exchanging the code", async () => {
    const start = beginOAuth();
    const cookie = start.headers.get("set-cookie")!;
    const request = new Request(`${origin}/api/onepassword/callback?code=synthetic-code&state=wrong`, { headers: { cookie } });
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const response = await completeOAuth(request);
    expect(response.status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("exchanges the code and never returns provider tokens", async () => {
    const start = beginOAuth();
    const location = new URL(start.headers.get("location")!);
    const fetcher = vi.fn(async (_url: string, init: RequestInit) => {
      const body = init.body as URLSearchParams;
      expect(body.get("redirect_uri")).toBe(`${origin}/api/onepassword/callback`);
      expect(body.get("code_verifier")).toBeTruthy();
      expect(body.get("code")).toBe("synthetic-code");
      expect(body.get("code_verifier")).not.toBe(location.searchParams.get("code_challenge"));
      return Response.json({ access_token: "synthetic-access", refresh_token: "synthetic-refresh" });
    });
    vi.stubGlobal("fetch", fetcher);
    const response = await completeOAuth(new Request(`${origin}/api/onepassword/callback?code=synthetic-code&state=${encodeURIComponent(location.searchParams.get("state")!)}`, { headers: { cookie: start.headers.get("set-cookie")! } }));
    expect(response.status).toBe(200);
    expect(await response.text()).not.toMatch(/synthetic-access|synthetic-refresh/);
    expect(response.headers.get("set-cookie")).toMatch(/Max-Age=0/);
    expect(fetcher).toHaveBeenCalledOnce();
  });
});
