import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";

const AUTHORIZATION_URL = "https://my.1password.com/oauth/authorize";
const TOKEN_URL = "https://api.1password.com/v1/oauth/token";
const SCOPE = "brokered-credentials:request-access brokered-credentials:read";
const COOKIE = "__Secure-bell-op-oauth";
const MAX_AGE = 600;

type Transaction = { state: string; verifier: string; createdAt: number };

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error("1Password OAuth is not configured.");
  return value;
}

export function redirectUri(): string {
  const value = required("ONEPASSWORD_REDIRECT_URI");
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash)
    throw new Error("ONEPASSWORD_REDIRECT_URI must be a clean HTTPS URL without query parameters.");
  return value;
}

function key(): Buffer {
  return createHash("sha256").update(required("ONEPASSWORD_OAUTH_STATE_SECRET")).digest();
}

function seal(transaction: Transaction): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from("bell.onepassword.oauth.v1"));
  const body = Buffer.concat([cipher.update(JSON.stringify(transaction)), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
}

function open(value: string): Transaction {
  try {
    const bytes = Buffer.from(value, "base64url");
    if (bytes.length < 29) throw new Error();
    const decipher = createDecipheriv("aes-256-gcm", key(), bytes.subarray(0, 12));
    decipher.setAAD(Buffer.from("bell.onepassword.oauth.v1"));
    decipher.setAuthTag(bytes.subarray(12, 28));
    const transaction = JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString()) as Transaction;
    if (!transaction.state || !transaction.verifier || !Number.isSafeInteger(transaction.createdAt)) throw new Error();
    if (Date.now() - transaction.createdAt > MAX_AGE * 1_000) throw new Error();
    return transaction;
  } catch {
    throw new Error("OAuth authorization expired or was invalid.");
  }
}

function cookie(value: string, maxAge = MAX_AGE): string {
  return `${COOKIE}=${value}; Path=/api/onepassword; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function readTransaction(request: Request): Transaction {
  const value = request.headers.get("cookie")?.split(";").map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  if (!value) throw new Error("OAuth authorization expired or was invalid.");
  return open(value);
}

export function beginOAuth(): Response {
  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const transaction = { state, verifier, createdAt: Date.now() } satisfies Transaction;
  const url = new URL(AUTHORIZATION_URL);
  url.search = new URLSearchParams({
    response_type: "code", client_id: required("ONEPASSWORD_CLIENT_ID"), redirect_uri: redirectUri(),
    scope: SCOPE, state, code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    code_challenge_method: "S256",
  }).toString();
  return new Response(null, { status: 302, headers: { Location: url.href, "Set-Cookie": cookie(seal(transaction)), "Cache-Control": "no-store" } });
}

function invalid(): Response {
  return new Response("Authorization could not be completed. Return to Bell and start again.", {
    status: 400, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function completeOAuth(request: Request): Promise<Response> {
  try {
    const input = new URL(request.url).searchParams;
    const code = input.get("code");
    const state = input.get("state");
    const transaction = readTransaction(request);
    if (input.has("error") || !code || !state) return invalid();
    const supplied = Buffer.from(state);
    const expected = Buffer.from(transaction.state);
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return invalid();
    const response = await fetch(TOKEN_URL, {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(20_000),
      headers: {
        Authorization: `Basic ${Buffer.from(`${required("ONEPASSWORD_CLIENT_ID")}:${required("ONEPASSWORD_CLIENT_SECRET")}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json",
      },
      body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri(), code_verifier: transaction.verifier }),
    });
    const value = await response.json().catch(() => ({})) as { access_token?: unknown; refresh_token?: unknown };
    if (!response.ok || typeof value.access_token !== "string" || typeof value.refresh_token !== "string") return invalid();
    return new Response("1Password authorization completed. Return to Bell.", {
      headers: {
        "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "Content-Type": "text/plain; charset=utf-8",
        "Set-Cookie": cookie("", 0),
      },
    });
  } catch { return invalid(); }
}

export { COOKIE };
