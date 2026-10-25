"use client";

import Image from "next/image";
import { Globe2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toEmbeddedBrowserbaseLiveViewUrl } from "../../../lib/browser/live-view";
import type { BrowserState } from "./types";

type View = { sessionKey: string; url: string } | { sessionKey: string; error: true };

export default function BrowserLiveView({ browser, eveSessionId }: { browser: BrowserState; eveSessionId?: string }) {
  const directUrl = toEmbeddedBrowserbaseLiveViewUrl(browser.liveUrl);
  const active = browser.provider === "browserbase" && browser.status === "active" && Boolean(browser.sessionId && eveSessionId);
  const sessionKey = `${eveSessionId}:${browser.sessionId}`;
  const [view, setView] = useState<View>();
  useEffect(() => {
    if (!active || directUrl) return;
    const controller = new AbortController();
    const load = async () => {
      const capability = await fetch("/api/context-capability", { method: "POST", cache: "no-store", signal: controller.signal });
      if (!capability.ok) throw new Error("Live View access denied.");
      const { token } = await capability.json() as { token: string };
      const query = new URLSearchParams({ sessionId: browser.sessionId!, eveSessionId: eveSessionId! });
      const response = await fetch(`/api/browser-live-view?${query}`, {
        cache: "no-store", signal: controller.signal, headers: { "x-browsie-context-capability": token },
      });
      if (!response.ok) throw new Error("Live View unavailable.");
      const { liveUrl } = await response.json() as { liveUrl?: string };
      const url = toEmbeddedBrowserbaseLiveViewUrl(liveUrl);
      if (!url) throw new Error("Invalid Live View URL.");
      if (!controller.signal.aborted) setView({ sessionKey, url });
    };
    void load().catch(() => { if (!controller.signal.aborted) setView({ sessionKey, error: true }); });
    return () => controller.abort();
  }, [active, directUrl, sessionKey, browser.sessionId, eveSessionId]);

  const current = active && view?.sessionKey === sessionKey ? view : undefined;
  const liveUrl = browser.status === "active" ? directUrl ?? (current && "url" in current ? current.url : undefined) : undefined;
  const failed = current && "error" in current;
  return liveUrl ? (
    <iframe src={liveUrl} title="Live Browserbase session" allow="clipboard-read; clipboard-write" />
  ) : browser.screenshotDataUrl ? (
    <Image src={browser.screenshotDataUrl} alt="Current browser page" fill unoptimized sizes="100vw" />
  ) : (
    <div className="empty-browser">
      <Globe2 size={32} />
      <strong>{failed ? "Live view unavailable" : active ? "Connecting live view" : "No page open"}</strong>
      <span>{failed ? "Reopen this task to retry the connection." : active ? "Waiting for Browserbase." : "Run a browser task to see the page."}</span>
    </div>
  );
}
