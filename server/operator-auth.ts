import { ForbiddenError, verifyHttpBasic } from "eve/channels/auth";

function operatorCredentials() {
  const username = process.env.BROWSIE_STUDIO_USERNAME?.trim();
  const password = process.env.BROWSIE_STUDIO_PASSWORD;
  return username && !username.includes(":") && password && Buffer.byteLength(password) >= 32
    ? { username, password } : undefined;
}

export function operatorAuth(request: Request) {
  const credentials = operatorCredentials();
  if (!credentials) return null;
  const authorization = request.headers.get("authorization");
  const result = verifyHttpBasic(authorization, credentials);
  if (!/^Bearer\s/i.test(authorization ?? "") && !["GET", "HEAD", "OPTIONS"].includes(request.method) &&
      (result.ok || request.headers.has("origin") || request.headers.has("sec-fetch-site"))) assertOperatorOrigin(request);
  return result.ok ? result.sessionAuth : null;
}

function assertOperatorOrigin(request: Request): void {
  const expected = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto");
  if (host) { expected.port = ""; expected.host = host; }
  if (protocol === "https" || protocol === "http") expected.protocol = `${protocol}:`;
  const origin = request.headers.get("origin");
  if (origin ? origin !== expected.origin : request.headers.get("sec-fetch-site") !== "same-origin")
    throw new ForbiddenError({ message: "Same-origin access required." });
}
