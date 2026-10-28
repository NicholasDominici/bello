"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEveAgent } from "eve/react";
import { Client } from "eve/client";
import { useEffect, useRef, useState } from "react";
import { browserPreview } from "./projection";
import Message from "./message";
import { requestErrorMessage } from "./request-error";
import { orbitPreview } from "./orbit-projection";
import People, { OrbitScene } from "./people";

export default function Chat({ sessionId, demoUrl }: { sessionId?: string; demoUrl: string }) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [workspaceTab, setWorkspaceTab] = useState<"people" | "browser" | null>(null);
  const [error, setError] = useState("");
  const [retiring, setRetiring] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [responding, setResponding] = useState<string | null>(null);
  const submissionFailed = useRef(false);
  const messagesElement = useRef<HTMLDivElement>(null);
  const followLatest = useRef(true);
  const agent = useEveAgent({
    onError(error) {
      submissionFailed.current = true;
      setError(requestErrorMessage(error));
    },
    initialSession: sessionId ? { sessionId, streamIndex: 0 } : undefined,
    resume: Boolean(sessionId),
    onSessionChange(session) {
      if (session && !sessionId)
        window.history.replaceState(null, "", `/s/${encodeURIComponent(session.sessionId)}`);
    },
  });
  useEffect(() => {
    const element = messagesElement.current;
    if (element && followLatest.current) element.scrollTop = element.scrollHeight;
  }, [agent.data.messages]);
  const busy = agent.status === "submitted" || agent.status === "streaming";
  const waiting = busy || agent.status === "resuming" || retiring || stopping || responding !== null;
  const stopped = agent.events.findLast(event =>
    ["turn.started", "turn.completed", "turn.cancelled"].includes(event.type))?.type === "turn.cancelled";
  const preview = browserPreview(agent.events);
  const orbit = orbitPreview(agent.events);
  const selectedTab = workspaceTab ?? orbit.latestArtifact;
  const hasMessages = agent.data.messages.some(message => message.role === "user");
  const pending = agent.data.messages
    .flatMap((message) => message.parts)
    .flatMap((part) => {
      if (part.type !== "dynamic-tool" || part.state !== "approval-requested") return [];
      const request = part.toolMetadata?.eve?.inputRequest;
      return request ? [request] : [];
    });
  async function send(text: string) {
    if (!text.trim() || waiting) return;
    setError("");
    setWorkspaceTab(null);
    submissionFailed.current = false;
    followLatest.current = true;
    try {
      await agent.send(text.trim());
      if (!submissionFailed.current) setInput("");
    } catch (error) {
      setError(requestErrorMessage(error));
    }
  }
  async function stop() {
    if (stopping) return;
    setStopping(true);
    setError("");
    try { await agent.cancel(); }
    catch { setError("Stop failed. Please retry."); }
    finally { setStopping(false); }
  }
  async function respond(requestId: string, answer: { text: string } | { optionId: string }) {
    if (responding) return;
    setResponding(requestId);
    setError("");
    try { await agent.respond([{ requestId, ...answer }]); }
    catch { setError("Reply failed. Please retry."); }
    finally { setResponding(null); }
  }
  async function newConversation() {
    if (waiting) return;
    setRetiring(true);
    setError("");
    try {
      if (agent.session)
        await new Client({ host: "" }).sessions.attach(agent.session.sessionId).reset();
      followLatest.current = true;
      agent.reset();
      setWorkspaceTab(null);
      setInput("");
      router.push("/");
    } catch {
      setError("Could not close this conversation. Please retry.");
    } finally {
      setRetiring(false);
    }
  }
  return (
    <main id="main-content">
      <a className="skip-link" href="#message">Skip to message</a>
      <header className="app-header">
        <div className="brand"><div className="brand-symbol" aria-hidden="true">◎</div><div><h1>BELL<span>O</span></h1><p>YOUR ASSISTANT, IN ORBIT</p></div></div>
        <div className="header-actions"><a className="orbit-brand" href="https://orbitsearch.com" target="_blank" rel="noreferrer"><span>Powered by</span><Image src="/orbit-wordmark.svg" width={49} height={21} alt="Orbit" /></a>
          <button className="new-chat" disabled={waiting} onClick={() => void newConversation()}>＋ New conversation</button>
        </div>
      </header>
      <section className="workspace">
        <div className="conversation">
          <div className="panel-label"><span>CONVERSATION</span><span className={`connection-state ${waiting ? "is-working" : ""}`}><i aria-hidden="true" />{waiting ? "In progress" : "Your workspace"}</span></div>
          {!hasMessages && <div className="conversation-intro"><p className="eyebrow">A LITTLE MORE CONTEXT</p><h2>Make your<br /><span>next move.</span></h2><p className="muted">Find people with Orbit. Explore the web.<br />Get things done with context.</p>
            <div className="starters"><button className="starter" disabled={waiting} onClick={() => { setInput("Find a person who "); document.getElementById("message")?.focus(); }}>◎ Find a person <span>↗</span></button>
              <button className="starter" disabled={waiting} onClick={() => void send(`Open ${demoUrl} with run, describe what the page shows, then take a screenshot.`)}>↗ Explore a website</button></div>
          </div>}
          <div
            className="messages"
            ref={messagesElement}
            aria-live="polite"
            onScroll={(event) => {
              const element = event.currentTarget;
              followLatest.current = element.scrollHeight - element.scrollTop - element.clientHeight < 60;
            }}
          >
            {agent.data.messages
              .filter((message) => message.role === "user" || message.role === "assistant")
              .map((message) => (
                <article key={message.id} className={message.role}>
                  <strong>{message.role === "user" ? "You" : "BELLO"}</strong>
                  {message.parts.map((part, index) =>
                    part.type === "text" ? (
                      message.role === "assistant"
                        ? <Message key={index} text={part.text} />
                        : <p key={index}>{part.text}</p>
                    ) : null,
                  )}
                </article>
              ))}
          </div>
          <p role="status" className="muted">
            {retiring ? "Closing conversation…" : stopping ? "Stopping…" : responding ? "Sending reply…" : waiting ? "Working…" : pending.length ? "Waiting for your reply" : stopped ? "Stopped" : "Ready"}
          </p>
          {(error || agent.error) && (
            <p role="alert">
              {error || "The agent request failed. Check server configuration and retry."}
            </p>
          )}
          {pending.map((request) => (
            <fieldset key={request.requestId} disabled={waiting || responding !== null}>
              <legend>{request.prompt}</legend>
              {request.options?.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() =>
                    void respond(request.requestId, { optionId: option.id })
                  }
                >
                  {option.label}
                </button>
              ))}
              {request.allowFreeform && (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    const text = String(
                      new FormData(event.currentTarget).get("reply") ?? "",
                    ).trim();
                    if (text)
                      void respond(request.requestId, { text });
                  }}
                >
                  <label htmlFor={`reply-${request.requestId}`}>Your reply</label>
                  <input id={`reply-${request.requestId}`} name="reply" required />
                  <button>Reply</button>
                </form>
              )}
            </fieldset>
          ))}
          <form className="composer"
            onSubmit={(event) => {
              event.preventDefault();
              void send(input);
            }}
          >
            <label htmlFor="message">Message BELLO</label>
            <textarea
              id="message"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Who are you looking for? What’s next?"
              disabled={waiting}
              aria-describedby="composer-help"
              onKeyDown={(event) => {
                if (!event.nativeEvent.isComposing && event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault();
                  void send(input);
                }
              }}
            />
            <p id="composer-help" className="composer-help">Ctrl / ⌘ + Enter to send. Enter for a new line.</p>
            <div className="actions">
              <button type="submit" disabled={waiting || !input.trim()}>
                Send
              </button>
              {busy && (
                <button
                  type="button"
                  disabled={stopping}
                  onClick={() => void stop()}
                >
                  {stopping ? "Stopping…" : "Stop"}
                </button>
              )}
            </div>
          </form>
        </div>
        <aside aria-label="Research workspace">
          <div className="workspace-toolbar"><div className="workspace-tabs" role="tablist" aria-label="Workspace view" onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            const next = event.key === "Home" ? "browser" : event.key === "End" ? "people" : selectedTab === "browser" ? "people" : "browser";
            setWorkspaceTab(next);
            document.getElementById(`${next}-tab`)?.focus();
          }}>
            <button id="browser-tab" role="tab" tabIndex={selectedTab === "browser" ? 0 : -1} aria-selected={selectedTab === "browser"} aria-controls="browser-panel" onClick={() => setWorkspaceTab("browser")}>Browser</button>
            <button id="people-tab" role="tab" tabIndex={selectedTab === "people" ? 0 : -1} aria-selected={selectedTab === "people"} aria-controls="people-panel" onClick={() => setWorkspaceTab("people")}>People {orbit.people.length > 0 && <span>{orbit.people.length}</span>}</button>
          </div><span className="workspace-label">YOUR ORBIT</span></div>
          {selectedTab === "people" ? <div id="people-panel" role="tabpanel" aria-labelledby="people-tab"><People people={orbit.people} search={orbit.search} error={orbit.error}/></div> : <div id="browser-panel" role="tabpanel" aria-labelledby="browser-tab">
            <div className="browser-bar"><span className="window-dots" aria-hidden="true"><i/><i/><i/></span><span className="address">{preview.url ?? "A window into the work"}</span><span>{preview.httpStatus ? `HTTP ${preview.httpStatus}` : preview.url ? "Captured" : "Waiting"}</span></div>
            {preview.screenshot ? <Image src={preview.screenshot} width={1360} height={900} unoptimized alt="Latest browser screenshot"/> : <div className="empty"><OrbitScene/><h3>See the bigger picture.</h3><p>When BELLO explores the web,<br />you’ll see the work right here.</p><span className="empty-note">Your own browser. One continuous conversation.</span></div>}
            <p className="footnote">Screenshots update on request. This panel is a capture, not an interactive browser.</p>
          </div>}
        </aside>
      </section>
    </main>
  );
}
