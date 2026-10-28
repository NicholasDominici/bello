/** Orbit tool ownership, durable idempotency receipts, and terminal-result caching. */
import { createHash } from "node:crypto";
import { defineState } from "eve/context";
import type { ToolContext } from "eve/tools";
import { OrbitError } from "../../server/orbit";
import type { OrbitSearch } from "../../lib/orbit-result";

interface Receipt {
  callId: string; signature: string; requestId: string;
  snapshot?: OrbitSearch; nextPollAt?: number;
}
export const orbitState = defineState<{ receipts: Receipt[]; cooldown?: { until: number; code: string; message: string } }>("bello.orbit.v1", () => ({ receipts: [] }));
export function assertOrbitOperator(ctx: ToolContext): void {
  ctx.abortSignal.throwIfAborted();
  if (ctx.session.auth.current?.authenticator === "linq-message")
    throw new OrbitError("operator_only", "The server's Orbit connection is available only in the web workspace, not messaging conversations.");
  const cooldown = orbitState.get().cooldown;
  if (cooldown && cooldown.until > Date.now())
    throw new OrbitError(cooldown.code, cooldown.message, cooldown.until - Date.now(), true);
}
export function orbitRequestId(sessionId: string, callId: string): string {
  return `bello_${createHash("sha256").update(`${sessionId}:${callId}`).digest("hex").slice(0, 40)}`;
}
export function searchReceipt(ctx: ToolContext, signature: string, newSearch: boolean): Receipt {
  const receipts = orbitState.get().receipts;
  const previous = receipts.find(row => row.callId === ctx.callId) ??
    (!newSearch ? receipts.findLast(row => row.signature === signature) : undefined);
  if (previous) return previous;
  const keep = receipts.filter(row => !row.snapshot || row.snapshot.status === "running");
  if (keep.length >= 8) throw new OrbitError("pending_limit", "Finish the pending Orbit searches before starting more in this conversation.");
  const receipt = { callId: ctx.callId, signature, requestId: orbitRequestId(ctx.session.id, ctx.callId) };
  // Stored before POST; the deterministic call-bound ID also survives replay before a state commit.
  const terminalSlots = 7 - keep.length;
  const terminal = terminalSlots > 0 ? receipts.filter(row => row.snapshot && row.snapshot.status !== "running").slice(-terminalSlots) : [];
  orbitState.update(current => ({ ...current, receipts: [...terminal, ...keep, receipt] }));
  return receipt;
}
export function rememberSearch(requestId: string, snapshot: OrbitSearch): void {
  orbitState.update(current => ({ ...current, receipts: current.receipts.map(row => row.requestId === requestId ? {
    ...row, snapshot, nextPollAt: snapshot.status === "running" ? Date.now() + (snapshot.poll_after_ms ?? 1500) : undefined,
  } : row) }));
}
export function cachedSearch(receipt: Receipt): OrbitSearch | undefined {
  if (!receipt.snapshot) return undefined;
  if (receipt.snapshot.status !== "running") return receipt.snapshot;
  const remaining = (receipt.nextPollAt ?? 0) - Date.now();
  return remaining > 0 ? { ...receipt.snapshot, poll_after_ms: remaining } : undefined;
}
export function orbitFailure(error: unknown, requestId?: string) {
  const safe = error instanceof OrbitError ? error : new OrbitError("request_failed", "Orbit could not complete this request. Check server configuration and retry the same operation.");
  const retryMs = safe.retryAfterMs;
  if (retryMs) orbitState.update(current => ({ ...current, cooldown: { until: Date.now() + retryMs, code: safe.code, message: safe.message } }));
  return {
    provider: "orbit" as const, operation: "error" as const, status: "error" as const,
    code: safe.code, message: safe.message, retryable: safe.retryable,
    ...(safe.retryAfterMs ? { retry_after_ms: safe.retryAfterMs } : {}),
    ...(requestId ? { request_id: requestId } : {}),
  };
}
