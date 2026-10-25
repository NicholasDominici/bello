import { afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ create: vi.fn(), draft: vi.fn(), promote: vi.fn() }));
vi.mock("../server/agent-contexts.js", () => ({
  createAgentContext: mocks.create, isDraftAgentContext: mocks.draft, promoteAgentContext: mocks.promote,
  ensureAgentContext: vi.fn(), listAgentContexts: vi.fn(), selectAgentContext: vi.fn(),
}));
import { BrowsieBrowserSession } from "../server/browser-session";
import { createBrowserContext, closeBrowserRuntime, runBrowserOperation, runCancelableBrowserWork, saveBrowserContext } from "../agent/lib/browser-runtime";
import { taskState } from "../agent/lib/task-state";
import { ContextContainer, contextStorage } from "../node_modules/eve/dist/src/context/container.js";

afterEach(() => { vi.restoreAllMocks(); vi.resetAllMocks(); vi.useRealTimers(); });
describe("Context cancellation", () => {
  it("does not open a replacement browser after a canceled remote Context creation finishes", () =>
    contextStorage.run(new ContextContainer(), async () => {
      const id = "context-cancellation", controller = new AbortController();
      let resolve!: (value: { id: string; name: string }) => void;
      mocks.create.mockReturnValue(new Promise(done => { resolve = done; }));
      const importCookies = vi.spyOn(BrowsieBrowserSession.prototype, "importCookies").mockResolvedValue();
      await runBrowserOperation(id, async browser => {
        vi.spyOn(browser, "hasStarted").mockReturnValue(true);
        vi.spyOn(browser, "start").mockResolvedValue();
        vi.spyOn(browser, "close").mockResolvedValue();
        vi.spyOn(browser, "exportCookies").mockResolvedValue([{ name: "fixture", value: "synthetic-only", domain: "shop.example", path: "/" }]);
      });
      try {
        const pending = runCancelableBrowserWork(id, controller.signal, () => createBrowserContext(id, "Fixture", controller.signal));
        await vi.waitFor(() => expect(mocks.create).toHaveBeenCalledOnce());
        controller.abort();
        await expect(pending).rejects.toMatchObject({ name: "AbortError" });
        resolve({ id: "created-context", name: "Fixture" });
        await new Promise<void>(done => setImmediate(done));
        expect(importCookies).not.toHaveBeenCalled();
        expect(taskState.get().browser.contextId).toBeUndefined();
      } finally { await closeBrowserRuntime(id); }
    }));

  it("does not promote a Context when cancellation interrupts the synchronization wait", () =>
    contextStorage.run(new ContextContainer(), async () => {
      vi.useFakeTimers();
      taskState.update(current => ({ ...current, browser: { lifecycle: "closed", contextId: "saved-context" } }));
      mocks.draft.mockResolvedValue(true);
      const controller = new AbortController();
      const pending = saveBrowserContext("saving-context", "Fixture", controller.signal);
      const rejected = expect(pending).rejects.toMatchObject({ name: "AbortError" });
      await vi.advanceTimersByTimeAsync(0);
      controller.abort();
      await vi.advanceTimersByTimeAsync(5_000);
      await rejected;
      expect(mocks.promote).not.toHaveBeenCalled();
    }));
});
