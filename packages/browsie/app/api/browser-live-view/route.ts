import Browserbase from "@browserbasehq/sdk";

import { requireContextCapability } from "../../../server/context-capability";
import { getContextStudio } from "../../../server/context-studio";
import { verifyBrowserHandoffToken } from "../../../server/handoff";
import { toEmbeddedBrowserbaseLiveViewUrl } from "../../../src/live-view";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("sessionId");
  if (!sessionId || !/^[a-zA-Z0-9_-]{8,128}$/.test(sessionId)) {
    return Response.json({ error: "A valid session ID is required." }, { status: 400 });
  }
  try {
    requireContextCapability(request);
  } catch {
    return Response.json({ error: "Live View access denied." }, { status: 403 });
  }

  const apiKey = process.env.BROWSERBASE_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Browserbase is not configured." }, { status: 503 });
  }

  try {
    const contextSession = getContextStudio().getSession(sessionId);
    if (!contextSession) {
      const token = request.headers.get("x-browsie-live-view-token");
      if (!token || verifyBrowserHandoffToken(token).browserSessionId !== sessionId)
        return Response.json({ error: "The live view is not available." }, { status: 404 });
    }
    const liveUrl = contextSession
      ? await getContextStudio().getLiveView(sessionId)
      : await liveViewForAgentSession(apiKey, sessionId);
    if (!liveUrl) {
      return Response.json({ error: "The live view is not ready." }, { status: 503 });
    }
    return Response.json({ liveUrl }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "The live view is not available." }, { status: 404 });
  }
}

async function liveViewForAgentSession(apiKey: string, sessionId: string) {
  const browserbase = new Browserbase({ apiKey });
  const debug = await browserbase.sessions.debug(sessionId);
  return toEmbeddedBrowserbaseLiveViewUrl(debug.debuggerFullscreenUrl);
}
