import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { assertStudioOrigin, studioAccess, studioCredentials } from "../../../server/browser/studio-auth";

export const CONTEXT_CAPABILITY_HEADER = "x-browsie-context-capability";
const TTL_MS = 6 * 60 * 60 * 1_000;

export function issueContextCapability(request: Request): {
  token: string;
} {
  requireOperator(request);
  const payload = `${Date.now() + TTL_MS}.${randomBytes(32).toString("base64url")}`;
  const token = `${payload}.${signature(payload)}`;
  return { token };
}

export function requireContextCapability(request: Request): void {
  requireOperator(request);
  const supplied = request.headers.get(CONTEXT_CAPABILITY_HEADER);
  if (!supplied) throw new ContextCapabilityError();
  const parts = /^(\d{13})\.([A-Za-z0-9_-]{43})\.([A-Za-z0-9_-]{43})$/.exec(supplied);
  const expires = Number(parts?.[1]);
  if (!parts || expires <= Date.now() || expires > Date.now() + TTL_MS ||
      !safeEqual(parts[3], signature(`${parts[1]}.${parts[2]}`))) throw new ContextCapabilityError();
}

export class ContextCapabilityError extends Error {}

function requireOperator(request: Request): void {
  if (studioAccess(request)) throw new ContextCapabilityError();
  assertStudioOrigin(request);
}

function signature(payload: string): string {
  const credentials = studioCredentials();
  if (!credentials) throw new ContextCapabilityError();
  return createHmac("sha256", credentials.password)
    .update(JSON.stringify([CONTEXT_CAPABILITY_HEADER, credentials.username, payload])).digest("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
