import { Client, type MessageStreamEvent } from "eve/client";
import { z } from "zod";

const browserResult = z.object({
  kind: z.literal("tool-result"), isError: z.literal(false).optional(),
  output: z.object({ workbench: z.object({ browser: z.object({
    provider: z.string(), status: z.string(), sessionId: z.string().optional(),
  }) }) }),
});

export function activeBrowserSession(events: readonly MessageStreamEvent[]): string | undefined {
  for (let index = events.length - 1; index >= 0; index--) {
    const event = events[index];
    if (["turn.cancelled", "session.failed", "session.completed"].includes(event.type)) return;
    if (event.type !== "action.result") continue;
    const result = browserResult.safeParse(event.data.result);
    if (!result.success) continue;
    const browser = result.data.output.workbench.browser;
    return browser.provider === "browserbase" && browser.status === "active" ? browser.sessionId : undefined;
  }
}

export async function taskOwnsBrowser(request: Request, eveSessionId: string, browserSessionId: string): Promise<boolean> {
  const client = new Client({
    host: new URL(request.url).origin,
    headers: { authorization: request.headers.get("authorization") ?? "" },
    redirect: "manual",
  });
  const snapshot = await client.sessions.attach(eveSessionId).snapshot({ signal: request.signal });
  return activeBrowserSession(snapshot.events) === browserSessionId;
}
