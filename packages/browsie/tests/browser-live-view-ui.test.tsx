// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import BrowserLiveView from "../src/BrowserLiveView";

const liveUrl = "https://www.browserbase.com/devtools-fullscreen/inspector.html?wss=connect.browserbase.com%2Fdebug%2Fsynthetic";
const browser = { provider: "browserbase" as const, status: "active" as const, sessionId: "synthetic-browser" };
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it("keeps the iframe connected across tool results and clears it when stopped", async () => {
  const fetcher = vi.fn(async (input: string) => input === "/api/context-capability" ? Response.json({ token: "synthetic" }) : Response.json({ liveUrl }));
  vi.stubGlobal("fetch", fetcher);
  const { rerender } = render(<BrowserLiveView browser={browser} eveSessionId="synthetic-task" />);
  const frame = await screen.findByTitle("Live Browserbase session");
  rerender(<BrowserLiveView browser={{ ...browser, url: "https://shop.example/next" }} eveSessionId="synthetic-task" />);
  expect(screen.getByTitle("Live Browserbase session")).toBe(frame);
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(fetcher.mock.calls[1][0]).toContain("eveSessionId=synthetic-task");
  rerender(<BrowserLiveView browser={{ ...browser, status: "idle" }} eveSessionId="synthetic-task" />);
  expect(screen.queryByTitle("Live Browserbase session")).toBeNull();
});
it("ignores a late response from the previous task", async () => {
  let finishOld: (response: Response) => void;
  vi.stubGlobal("fetch", vi.fn(async (input: string) => {
    if (input === "/api/context-capability") return Response.json({ token: "synthetic" });
    if (input.includes("old-task")) return new Promise<Response>(resolve => { finishOld = resolve; });
    return Response.json({ liveUrl });
  }));
  const { rerender } = render(<BrowserLiveView browser={browser} eveSessionId="old-task" />);
  await waitFor(() => expect(finishOld).toBeDefined());
  rerender(<BrowserLiveView browser={{ ...browser, sessionId: "new-browser" }} eveSessionId="new-task" />);
  const frame = await screen.findByTitle("Live Browserbase session");
  await act(async () => finishOld(Response.json({ liveUrl: liveUrl.replace("synthetic", "stale") })));
  expect(screen.getByTitle("Live Browserbase session")).toBe(frame);
  expect(frame.getAttribute("src")).not.toContain("stale");
});
it("fails closed when operator capability issuance fails", async () => {
  const fetcher = vi.fn(async () => new Response(null, { status: 403 }));
  vi.stubGlobal("fetch", fetcher);
  render(<BrowserLiveView browser={browser} eveSessionId="synthetic-task" />);
  expect(await screen.findByText("Live view unavailable")).toBeDefined();
  expect(fetcher).toHaveBeenCalledOnce();
});
