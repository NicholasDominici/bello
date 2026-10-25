import { afterEach, describe, expect, it, vi } from "vitest";
import { create_spend_request, retrieve_spend_request } from "@stripe/link-integrations-eve/tools";
import { runBrowserOperation } from "browsie/runtime";
import create from "../agent/extensions/link/tools/create_spend_request";
import retrieve from "../agent/extensions/link/tools/retrieve_spend_request";
import disconnect from "../agent/tools/link_disconnect";

vi.mock("browsie/runtime", () => ({ runBrowserOperation: vi.fn() }));
const context = { session: { id: "linq-chat-session" }, abortSignal: new AbortController().signal } as never;
const purchase = {
  credential_type: "card" as const, amount: 4200, currency: "usd",
  request_approval: true, test: false,
  merchant_name: "Example", merchant_url: "https://shop.example",
  context: "The user requested this notebook from Example Shop. This amount includes the agreed items, shipping, and taxes.",
};
const request = (status: string) => ({ id: "spend_1", status, created_at: "2026-10-22T00:00:00Z", updated_at: "2026-10-22T00:00:00Z" }) as Awaited<ReturnType<typeof retrieve_spend_request.execute>>;

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe("Link checkout guards", () => {
  it("retains the native spend confirmation and requires confirmation to disconnect", async () => {
    expect(create.approval).toBe(create_spend_request.approval);
    expect(create.approval).toBeDefined();
    expect(disconnect.approval).toBeDefined();
    vi.stubEnv("BROWSIE_LOG_SESSION", "false");
    const execute = vi.spyOn(create_spend_request, "execute").mockResolvedValue(request("pending_approval") as never);
    await create.execute(purchase, context);
    expect(execute).toHaveBeenCalledWith(purchase, expect.objectContaining(context));
  });

  it("refuses creation or credential retrieval when browser logging is enabled", async () => {
    vi.stubEnv("BROWSIE_LOG_SESSION", "true");
    const execute = vi.spyOn(create_spend_request, "execute");
    expect(() => create.execute(purchase, context)).toThrow("BROWSIE_LOG_SESSION=false");
    await expect(retrieve.execute({ id: "spend_1", include: ["card"] }, context)).rejects.toThrow("BROWSIE_LOG_SESSION=false");
    expect(execute).not.toHaveBeenCalled();
  });

  it.each([
    { id: "spend_1", include: ["card,shared_payment_token"] },
    { id: "spend_1", include: ["unknown_credential"] },
    ...["spend_1?include=card", "spend_1#card", "../spend_1", "spend_1%3Finclude%3Dcard"].map((id) => ({ id })),
  ])("rejects malformed credential requests before calling Link: %j", async (input) => {
    vi.stubEnv("BROWSIE_LOG_SESSION", "true");
    const execute = vi.spyOn(retrieve_spend_request, "execute").mockResolvedValue(request("approved"));
    await expect(retrieve.execute(input as Parameters<typeof retrieve.execute>[0], context)).rejects.toThrow();
    expect(execute).not.toHaveBeenCalled();
    expect(runBrowserOperation).not.toHaveBeenCalled();
  });

  it.each([undefined, []])("permits status-only retrieval with include=%j", async (include) => {
    vi.stubEnv("BROWSIE_LOG_SESSION", "true");
    const input = { id: "spend_1", include };
    const execute = vi.spyOn(retrieve_spend_request, "execute").mockResolvedValue(request("approved"));
    await expect(retrieve.execute(input, context)).resolves.toMatchObject({ status: "approved" });
    expect(execute).toHaveBeenCalledExactlyOnceWith(input, expect.objectContaining(context));
    expect(runBrowserOperation).not.toHaveBeenCalled();
  });

  it.each(["created", "pending_approval", "requires_action", "denied", "expired", "canceled", "failed"])(
    "returns %s status without requesting credentials", async (status) => {
      vi.stubEnv("BROWSIE_LOG_SESSION", "false");
      const execute = vi.spyOn(retrieve_spend_request, "execute").mockResolvedValue(request(status));
      expect(await retrieve.execute({ id: "spend_1", include: ["card"] }, context)).toMatchObject({ status });
      expect(execute).toHaveBeenCalledExactlyOnceWith({ id: "spend_1" }, expect.objectContaining(context));
      expect(runBrowserOperation).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["card"], ["shared_payment_token"], ["link_pay_token"], ["card", "shared_payment_token"],
  ] as const)("checks approval and the actual browser before retrieving %j", async (...include) => {
    vi.stubEnv("BROWSIE_LOG_SESSION", "false");
    const execute = vi.spyOn(retrieve_spend_request, "execute").mockResolvedValue(request("approved"));
    const hosted = vi.fn(async (_signal, operation) => operation());
    vi.mocked(runBrowserOperation).mockImplementation(async (_session, operation) => ({
      result: await operation({ withHostedPage: hosted } as never), workbench: {},
    }) as never);
    await retrieve.execute({ id: "spend_1", include: [...include] }, context);
    expect(execute).toHaveBeenNthCalledWith(1, { id: "spend_1" }, expect.objectContaining(context));
    expect(execute).toHaveBeenNthCalledWith(2, { id: "spend_1", include: [...include] }, expect.objectContaining(context));
    expect(hosted).toHaveBeenCalledOnce();
  });

  it("does not retrieve credentials when a reattached browser has logging enabled", async () => {
    vi.stubEnv("BROWSIE_LOG_SESSION", "false");
    const execute = vi.spyOn(retrieve_spend_request, "execute").mockResolvedValue(request("approved"));
    vi.mocked(runBrowserOperation).mockRejectedValue(new Error("Session logging configuration cannot be verified."));
    await expect(retrieve.execute({ id: "spend_1", include: ["card"] }, context)).rejects.toThrow("logging");
    expect(execute).toHaveBeenCalledOnce();
  });

  it("discards credentials if approval changes between status check and retrieval", async () => {
    vi.stubEnv("BROWSIE_LOG_SESSION", "false");
    vi.spyOn(retrieve_spend_request, "execute")
      .mockResolvedValueOnce(request("approved"))
      .mockResolvedValueOnce({ ...request("canceled"), card: { number: "private-card" } } as never);
    vi.mocked(runBrowserOperation).mockResolvedValue({ result: { safe: true }, workbench: {} } as never);
    await expect(retrieve.execute({ id: "spend_1", include: ["card"] }, context)).rejects.toThrow("changed status");
  });
});
