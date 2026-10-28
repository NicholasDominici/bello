/** Orbit contract, retry/idempotency, billing and credential boundaries. No live APIs. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { OrbitClient, OrbitError, orbitConfig } from "../server/orbit";
import searchTool from "../agent/tools/orbit_search";
import statusTool from "../agent/tools/orbit_search_status";
import profileTool from "../agent/tools/orbit_profile";
import { orbitRequestId, orbitState, searchReceipt } from "../agent/lib/orbit";
import { ContextContainer, contextStorage } from "../node_modules/eve/dist/src/context/container.js";

const config = { apiKey: "synthetic-orbit-key", origin: "https://api.orbitsearch.com" };
const input = { request_id: "fixed-request", query: "compiler engineers", limit: 2, profile_depth: "partial" as const, candidate_discovery: false };
const signal = () => new AbortController().signal;
const raw = (status = "completed") => ({
  search_id: "search-fixture", request_id: "fixed-request", status,
  results: [{ profile_id: "profile-fixture", status: "ready", generation_level: 3,
    profile: { displayName: "Mira Chen", profileUrl: "https://orbitsearch.com/mira", headline: { jobTitle: "Compiler engineer", companyName: "Juniper" },
      location: { city: "London" }, sections: { bio: { bio: "Builds compiler tooling." } },
      sources: [{ link: "https://example.com/work", title: "Work" }, { link: "javascript:alert(1)" }],
      internalCredential: "never-forward-this-field" },
  }], billing: { status: "settled", consumedCredits: 2, heldCredits: 0 },
});
const context = (callId = "call-fixture", authenticator = "basic") => ({
  callId, abortSignal: signal(), session: { id: "session-fixture", auth: { current: { authenticator } } },
}) as never;
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("Orbit v3 client", () => {
  it("normalizes real contract fields and never forwards credentials or unsafe sources", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(raw()));
    const result = await new OrbitClient({ config, fetch: fetcher }).search(input, signal());
    expect(result.people[0]).toMatchObject({ name: "Mira Chen", headline: "Compiler engineer · Juniper", location: "London", bio: "Builds compiler tooling.", sources: [{ url: "https://example.com/work", title: "Work" }] });
    const options = fetcher.mock.calls[0][1]!;
    expect(options.redirect).toBe("error");
    expect(options.headers).toMatchObject({ Authorization: "Bearer synthetic-orbit-key", "Idempotency-Key": "fixed-request" });
    expect(JSON.parse(String(options.body))).toEqual({ ...input, include_profile: true });
    expect(JSON.stringify(result)).not.toContain("never-forward");
    expect(JSON.stringify(result)).not.toContain(config.apiKey);
  });
  it("reuses the exact body and idempotency key on bounded transient retries", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response("private-diagnostic", { status: 503, headers: { "Retry-After": "1" } })).mockResolvedValueOnce(Response.json(raw()));
    const sleep = vi.fn(async () => undefined);
    await new OrbitClient({ config, fetch: fetcher, sleep }).search(input, signal());
    expect(sleep).toHaveBeenCalledWith(1000, expect.any(AbortSignal));
    expect(fetcher.mock.calls[0][1]?.body).toBe(fetcher.mock.calls[1][1]?.body);
  });
  it.each([401, 402, 403, 409])("does not retry HTTP %s or reflect its private response", async status => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response("private-provider-token", { status }));
    let error: unknown;
    try { await new OrbitClient({ config, fetch: fetcher }).search(input, signal()); } catch (caught) { error = caught; }
    expect(error).toBeInstanceOf(OrbitError);
    expect(String(error)).not.toContain("private-provider-token");
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it("returns a long Retry-After rather than retrying before it expires", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response("", { status: 429, headers: { "Retry-After": "60" } }));
    const sleep = vi.fn(async () => undefined);
    await expect(new OrbitClient({ config, fetch: fetcher, sleep }).search(input, signal())).rejects.toMatchObject({ code: "rate_limited", retryAfterMs: 60_000 });
    expect(sleep).not.toHaveBeenCalled();
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it("encodes profile IDs and preserves the read's idempotency key", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ profile_id: "canonical", generation_level: 3, profile: raw().results[0].profile }));
    const result = await new OrbitClient({ config, fetch: fetcher }).profile("alias/id?", "read-receipt", signal());
    expect(fetcher.mock.calls[0][0]).toBe("https://api.orbitsearch.com/v3/enrich/alias%2Fid%3F");
    expect(result.person.profile_id).toBe("canonical");
    expect(fetcher.mock.calls[0][1]?.headers).toMatchObject({ "Idempotency-Key": "read-receipt" });
  });
  it("rejects malformed and oversized bodies instead of inventing successful results", async () => {
    for (const response of [Response.json({ results: [] }), new Response("x".repeat(2_000_001))]) {
      await expect(new OrbitClient({ config, fetch: vi.fn<typeof fetch>().mockResolvedValue(response) }).search(input, signal())).rejects.toMatchObject({ code: "invalid_response" });
    }
  });
  it("prioritizes the visible biography's supporting sources", async () => {
    const value = raw();
    Object.assign(value.results[0].profile.sections.bio, { sources: [{ link: "https://evidence.example/bio", title: "Biography evidence" }] });
    const result = await new OrbitClient({ config, fetch: vi.fn<typeof fetch>().mockResolvedValue(Response.json(value)) }).search(input, signal());
    expect(result.people[0].sources[0]).toEqual({ url: "https://evidence.example/bio", title: "Biography evidence" });
  });
  it("redacts an echoed operator key even from successful profile content", async () => {
    const value = raw(); value.results[0].profile.sections.bio.bio = config.apiKey;
    const result = await new OrbitClient({ config, fetch: vi.fn<typeof fetch>().mockResolvedValue(Response.json(value)) }).search(input, signal());
    expect(result.people[0].bio).toBe("[redacted]");
  });
  it("accepts only explicit secure server configuration", () => {
    expect(() => orbitConfig({})).toThrow("ORBIT_API_KEY");
    for (const host of ["http://example.com", "https://user:pass@example.com", "https://example.com/path"])
      expect(() => orbitConfig({ ORBIT_API_KEY: "fixture", ORBIT_API_HOST: host })).toThrow();
    expect(orbitConfig({ ORBIT_API_KEY: "fixture", ORBIT_API_HOST: "http://127.0.0.1:4999" }).origin).toBe("http://127.0.0.1:4999");
  });
});

describe("Orbit tools and durable receipts", () => {
  const searchInput = { query: "compiler engineers", limit: 2, profile_depth: "partial" as const, candidate_discovery: false, new_search: false };
  it("deduplicates repeated searches, caches terminal status, and keeps request IDs stable on replay", () => contextStorage.run(new ContextContainer(), async () => {
    vi.stubEnv("ORBIT_API_KEY", "synthetic-key");
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (_url, options) => Response.json({ ...raw(), request_id: JSON.parse(String(options?.body)).request_id }));
    vi.stubGlobal("fetch", fetcher);
    const first = await searchTool.execute(searchInput, context());
    expect(first).toMatchObject({ status: "completed" });
    await searchTool.execute(searchInput, context("second-call"));
    await statusTool.execute({ search_id: "search-fixture" }, context());
    expect(fetcher).toHaveBeenCalledOnce();
    const receipt = orbitState.get().receipts[0];
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body)).request_id).toBe(receipt.requestId);
    expect(receipt.requestId).toBe(orbitRequestId("session-fixture", "call-fixture"));
    await searchTool.execute({ ...searchInput, new_search: true }, context("explicit-fresh"));
    expect(fetcher).toHaveBeenCalledTimes(2);
  }));
  it("preserves the request ID after an uncertain transport failure", () => contextStorage.run(new ContextContainer(), async () => {
    vi.stubEnv("ORBIT_API_KEY", "synthetic-key");
    const fetcher = vi.fn<typeof fetch>().mockRejectedValueOnce(new Error("private-connection-detail")).mockImplementationOnce(async (_url, options) => Response.json({ ...raw(), request_id: JSON.parse(String(options?.body)).request_id }));
    vi.stubGlobal("fetch", fetcher);
    const failed = await searchTool.execute(searchInput, context());
    expect(failed).toMatchObject({ status: "error", code: "connection_failed" });
    await searchTool.execute(searchInput, context("retry-call"));
    expect(fetcher.mock.calls[0][1]?.body).toBe(fetcher.mock.calls[1][1]?.body);
    expect(JSON.stringify(failed)).not.toContain("private-connection-detail");
  }));
  it("does not poll too quickly or leak searches across conversations", () => contextStorage.run(new ContextContainer(), async () => {
    vi.stubEnv("ORBIT_API_KEY", "synthetic-key");
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (_url, options) => Response.json({ ...raw("running"), request_id: JSON.parse(String(options?.body)).request_id }));
    vi.stubGlobal("fetch", fetcher);
    await searchTool.execute(searchInput, context());
    expect(await statusTool.execute({ search_id: "search-fixture" }, context())).toMatchObject({ status: "running" });
    expect(await statusTool.execute({ search_id: "foreign" }, context())).toMatchObject({ status: "error" });
    expect(fetcher).toHaveBeenCalledOnce();
  }));
  it("honors Retry-After across repeated tool calls", () => contextStorage.run(new ContextContainer(), async () => {
    vi.stubEnv("ORBIT_API_KEY", "synthetic-key");
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response("", { status: 429, headers: { "Retry-After": "60" } }));
    vi.stubGlobal("fetch", fetcher);
    expect(await searchTool.execute(searchInput, context())).toMatchObject({ code: "rate_limited" });
    expect(await profileTool.execute({ profile_id: "anything" }, context("next-call"))).toMatchObject({ code: "rate_limited" });
    expect(fetcher).toHaveBeenCalledOnce();
  }));
  it("keeps pending receipts when pruning terminal history", () => contextStorage.run(new ContextContainer(), () => {
    for (let i = 0; i < 8; i++) searchReceipt(context(`call-${i}`), `query-${i}`, false);
    expect(() => searchReceipt(context("overflow"), "next", false)).toThrow("Finish the pending");
    expect(orbitState.get().receipts).toHaveLength(8);
  }));
  it("never lends the operator key to messaging senders", async () => {
    const fetcher = vi.fn<typeof fetch>(); vi.stubGlobal("fetch", fetcher);
    for (const tool of [
      () => searchTool.execute(searchInput, context("call", "linq-message")),
      () => statusTool.execute({ search_id: "anything" }, context("call", "linq-message")),
      () => profileTool.execute({ profile_id: "anything" }, context("call", "linq-message")),
    ]) expect(await tool()).toMatchObject({ code: "operator_only", status: "error" });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
