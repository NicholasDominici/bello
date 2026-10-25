import Image from "next/image";
import { Thinking } from "./thinking";

export function BrowserWindow({
  url,
  httpStatus,
  screenshot,
  working,
}: {
  url?: string;
  httpStatus?: number;
  screenshot?: string;
  working: boolean;
}) {
  const status = httpStatus ? `HTTP ${httpStatus}` : url ? "Live session" : "Idle";
  return (
    <aside className="browser" aria-label="Browser capture">
      <div className="browser-chrome">
        <span className="traffic" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <p className="browser-url" title={url}>
          {url ?? "Your browser will appear here"}
        </p>
        <span className="browser-status" data-live={Boolean(url) || undefined}>
          {status}
        </span>
      </div>
      <div className="browser-viewport">
        {screenshot ? (
          <Image
            key={screenshot.slice(-48)}
            className="browser-shot"
            src={screenshot}
            width={1360}
            height={900}
            unoptimized
            alt={url ? `Latest browser screenshot of ${url}` : "Latest browser screenshot"}
          />
        ) : (
          <div className="browser-empty">
            {working ? (
              <Thinking label="Browsing" />
            ) : (
              <>
                <p className="browser-empty-title">See what Bell sees.</p>
                <p className="browser-empty-copy">Ask for a screenshot after a browser action.</p>
              </>
            )}
          </div>
        )}
      </div>
      <p className="browser-footnote">
        Screenshots update on request. This panel is a capture, not an interactive browser.
      </p>
    </aside>
  );
}
