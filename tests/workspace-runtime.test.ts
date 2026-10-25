import { afterEach, describe, expect, it, vi } from "vitest";

import {
  browserChannelEvents,
  closeBrowserRuntime,
  hasBrowserRuntime,
  runBrowserOperation,
} from "browsie/runtime";
import lifecycle from "../agent/hooks/browser-lifecycle";
import run from "../agent/tools/run";
import snapshot from "../agent/tools/snapshot";
import {
  ContextContainer,
  contextStorage,
} from "../node_modules/eve/dist/src/context/container.js";

// Use the installed Eve context container to
// verify that Bell and the compiled package share real Eve state across imports.
// Only browser I/O is stubbed; no provider credentials are needed.

const sessionId = "workspace-import-test";
const context = (signal = new AbortController().signal) =>
  ({ session: { id: sessionId }, abortSignal: signal }) as never;
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

async function withEveContext(check: () => Promise<void>) {
  await contextStorage.run(new ContextContainer(), async () => {
    try {
      await check();
    } finally {
      await closeBrowserRuntime(sessionId);
    }
  });
}

describe("Bell's compiled Browsie workspace dependency", () => {
  it("does not recreate Bell's runtime when canceled before queued work starts", () => withEveContext(async () => {
    const controller = new AbortController();
    const pending = run.execute({ actions: [{ action: "goto", url: "https://example.com/" }] }, context(controller.signal));
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(hasBrowserRuntime(sessionId)).toBe(false);
  }));
  it("shares one runtime across Bell's tool and lifecycle imports", () => withEveContext(async () => {
    const result = { completed: 1, url: "https://example.com/" };
    const runBrowser = vi.fn().mockResolvedValue(result);
    const snapshotBrowser = vi.fn().mockResolvedValue({ url: result.url });
    const closeBrowser = vi.fn().mockResolvedValue(undefined);

    await runBrowserOperation(sessionId, async (browser) => {
      vi.spyOn(browser, "run").mockImplementation(runBrowser);
      vi.spyOn(browser, "snapshot").mockImplementation(snapshotBrowser);
      vi.spyOn(browser, "close").mockImplementation(closeBrowser);
    });

    const actions = [{ action: "goto" as const, url: result.url }];
    expect(await run.execute({ actions }, context())).toMatchObject({ result });
    expect(runBrowser).toHaveBeenCalledWith(actions);
    expect(await snapshot.execute({}, context())).toMatchObject({ result: { url: result.url } });
    expect(snapshotBrowser).toHaveBeenCalledOnce();

    await lifecycle.events!["turn.completed"]!({} as never, context());
    expect(hasBrowserRuntime(sessionId)).toBe(true);
    await browserChannelEvents["session.completed"]({}, undefined, context());
    expect(closeBrowser).toHaveBeenCalledOnce();
    expect(hasBrowserRuntime(sessionId)).toBe(false);
  }));

  it("closes the shared runtime when Bell passes an already canceled signal", () => withEveContext(async () => {
    const runBrowser = vi.fn();
    const closeBrowser = vi.fn().mockResolvedValue(undefined);
    await runBrowserOperation(sessionId, async (browser) => {
      vi.spyOn(browser, "run").mockImplementation(runBrowser);
      vi.spyOn(browser, "close").mockImplementation(closeBrowser);
    });
    const controller = new AbortController();
    controller.abort();

    await expect(
      run.execute(
        { actions: [{ action: "goto", url: "https://example.com/" }] },
        context(controller.signal),
      ),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(runBrowser).not.toHaveBeenCalled();
    expect(closeBrowser).toHaveBeenCalledOnce();
    expect(hasBrowserRuntime(sessionId)).toBe(false);
  }));
});
