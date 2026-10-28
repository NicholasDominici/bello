/** Assistant output is untrusted: format Markdown without enabling scripts or raw HTML. */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Message from "../app/message";

const render = (text: string) => renderToStaticMarkup(createElement(Message, { text }));

describe("assistant Markdown", () => {
  it("renders readable lists, emphasis, code and comparison tables", () => {
    const html = render("**Summary**\n\n- `pnpm check`\n- Review results\n\n| Check | Result |\n| --- | --- |\n| Build | Passed |");
    expect(html).toContain("<strong>Summary</strong>");
    expect(html).toContain("<li><code>pnpm check</code></li>");
    expect(html).toContain("<table>");
  });

  it("discards raw executable HTML and unsafe link protocols", () => {
    const html = render('<script>alert(1)</script>\n\n<img src=x onerror="alert(1)">\n\n[Open](javascript:alert%281%29)');
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("onerror");
  });

  it("does not fetch images embedded in assistant output", () => {
    const html = render("![Preview](https://example.com/tracker.png)");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("tracker.png");
    expect(html).toContain("Preview");
  });

  it("keeps ordinary HTTPS citations usable", () => {
    expect(render("[Source](https://example.com/docs)")).toContain('href="https://example.com/docs"');
  });
});
