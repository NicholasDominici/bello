"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEveAgent } from "eve/react";
import { Client } from "eve/client";
import { useEffect, useRef, useState } from "react";
import { browserPreview } from "./projection";
import { BellMark } from "./ui/bell-mark";
import { BrowserWindow } from "./ui/browser-window";
import { Composer } from "./ui/composer";
import { StackLockup } from "./ui/stack-lockup";
import { Thinking, TypingBubble } from "./ui/thinking";

export default function Chat({ sessionId, demoUrl }: { sessionId?: string; demoUrl: string }) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [retiring, setRetiring] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const agent = useEveAgent({
    initialSession: sessionId ? { sessionId, streamIndex: 0 } : undefined,
    resume: Boolean(sessionId),
    onSessionChange(session) {
      if (session && !sessionId)
        window.history.replaceState(null, "", `/s/${encodeURIComponent(session.sessionId)}`);
    },
  });
  const busy = agent.status === "submitted" || agent.status === "streaming";
  const waiting = busy || agent.status === "resuming" || retiring;
  const preview = browserPreview(agent.events);
  const messages = agent.data.messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => ({
      id: message.id,
      role: message.role,
      texts: message.parts.flatMap((part) => (part.type === "text" && part.text ? [part.text] : [])),
    }))
    .filter((message) => message.texts.length > 0);
  const last = messages.at(-1);
  const showTyping = busy && (!last || last.role === "user");
  const pending = agent.data.messages
    .flatMap((message) => message.parts)
    .flatMap((part) => {
      if (part.type !== "dynamic-tool" || part.state !== "approval-requested") return [];
      const request = part.toolMetadata?.eve?.inputRequest;
      return request ? [request] : [];
    });

  const lastText = last?.texts.at(-1) ?? "";
  useEffect(() => {
    const thread = threadRef.current;
    if (thread) thread.scrollTo({ top: thread.scrollHeight, behavior: "smooth" });
  }, [messages.length, lastText.length, showTyping, pending.length]);

  async function send(text: string) {
    if (!text.trim() || waiting) return;
    setError("");
    setInput("");
    try {
      await agent.send(text.trim());
    } catch {
      setError("The request failed. Check the local server and retry.");
    }
  }
  async function newConversation() {
    if (waiting) return;
    setRetiring(true);
    setError("");
    try {
      if (agent.session)
        await new Client({ host: "" }).sessions.attach(agent.session.sessionId).reset();
      agent.reset();
      setInput("");
      router.push("/");
    } catch {
      setError("Could not close this conversation. Please retry.");
    } finally {
      setRetiring(false);
    }
  }
  function respond(response: { requestId: string; optionId?: string; text?: string }) {
    void agent.respond([response]).catch(() => setError("Reply failed. Please retry."));
  }

  return (
    <main className="page">
      <header className="topbar">
        <Link href="/" className="brand" aria-label="Bell home">
          <BellMark size={32} intro />
          <span className="brand-name">Bell</span>
        </Link>
        <button className="ghost-button" disabled={waiting} onClick={() => void newConversation()}>
          New conversation
        </button>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <h1 id="hero-title" className="hero-title">
          The stack for <span className="accent">building</span>
          <BellMark size={36} ringing={busy} />
          <br />
          personal assistant agents.
        </h1>
        <p className="hero-copy">Ask. Browse. Verify. One conversation, one persistent browser.</p>
      </section>

      <section className="workspace">
        <div className="phone">
          <div className="phone-head">
            <span className="avatar" aria-hidden="true">
              B
            </span>
            <span className="phone-name">
              Bell
              <svg viewBox="0 0 16 16" width="10" height="10" aria-hidden="true">
                <path
                  d="m6 3 5 5-5 5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </div>

          <div className="thread" ref={threadRef} aria-live="polite">
            {messages.length === 0 && !showTyping ? (
              <div className="thread-empty">
                <p>Bell can browse, buy and book on your behalf.</p>
                <button
                  className="starter"
                  disabled={waiting}
                  onClick={() =>
                    void send(
                      `Open ${demoUrl} with run, describe what the page shows, then take a screenshot.`,
                    )
                  }
                >
                  Open demo site
                  <span aria-hidden="true">{" ↗"}</span>
                </button>
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className={`bubble-row ${message.role}`}>
                  <span className="sr-only">{message.role === "user" ? "You" : "Bell"}:</span>
                  {message.texts.map((text, index) => (
                    <p key={index} className="bubble">
                      {text}
                    </p>
                  ))}
                </div>
              ))
            )}
            {showTyping && <TypingBubble />}

            {pending.map((request) => (
              <fieldset key={request.requestId} className="request">
                <legend className="bubble">{request.prompt}</legend>
                {request.options && request.options.length > 0 && (
                  <div className="request-options">
                    {request.options.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className="chip"
                        onClick={() =>
                          respond({ requestId: request.requestId, optionId: option.id })
                        }
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
                {request.allowFreeform && (
                  <form
                    className="request-reply"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const text = String(
                        new FormData(event.currentTarget).get("reply") ?? "",
                      ).trim();
                      if (text) respond({ requestId: request.requestId, text });
                    }}
                  >
                    <label htmlFor={`reply-${request.requestId}`} className="sr-only">
                      Your reply
                    </label>
                    <input
                      id={`reply-${request.requestId}`}
                      name="reply"
                      placeholder="Your reply"
                      required
                    />
                    <button className="chip" data-primary>
                      Reply
                    </button>
                  </form>
                )}
              </fieldset>
            ))}
          </div>

          <div className="phone-foot">
            <p role="status" className="status">
              {waiting ? <Thinking /> : <span className="sr-only">Ready</span>}
            </p>
            {(error || agent.error) && (
              <p role="alert" className="alert">
                {error || "The agent request failed. Check server configuration and retry."}
              </p>
            )}
            <Composer
              value={input}
              onChange={setInput}
              onSubmit={() => void send(input)}
              onStop={() => void agent.cancel().catch(() => setError("Stop failed. Please retry."))}
              disabled={waiting}
              busy={busy}
            />
          </div>
        </div>

        <BrowserWindow
          url={preview.url}
          httpStatus={preview.httpStatus}
          screenshot={preview.screenshot}
          working={busy}
        />
      </section>

      <StackLockup />
    </main>
  );
}
