import { ForbiddenError, verifyHttpBasic } from "eve/channels/auth";

export function studioCredentials() {
  const username = process.env.BROWSIE_STUDIO_USERNAME?.trim();
  const password = process.env.BROWSIE_STUDIO_PASSWORD;
  return username && !username.includes(":") && password && Buffer.byteLength(password) >= 32
    ? { username, password } : undefined;
}

export function studioAuth(request: Request) {
  const credentials = studioCredentials();
  if (!credentials) return null;
  const authorization = request.headers.get("authorization");
  const result = verifyHttpBasic(authorization, credentials);
  if (!/^Bearer\s/i.test(authorization ?? "") && !["GET", "HEAD", "OPTIONS"].includes(request.method) &&
      (result.ok || request.headers.has("origin") || request.headers.has("sec-fetch-site"))) assertStudioOrigin(request);
  return result.ok ? result.sessionAuth : null;
}

export function studioAccess(request: Request): Response | undefined {
  const headers = { "cache-control": "no-store" };
  if (!studioCredentials())
    return Response.json({ error: "Management access is not configured." }, { status: 503, headers });
  try {
    if (!studioAuth(request))
      return Response.json({ error: "Operator sign-in required." }, {
        status: 401, headers: { ...headers, "www-authenticate": 'Basic realm="Browsie", charset="UTF-8"' },
      });
  } catch (error) {
    if (error instanceof ForbiddenError) return error.response;
    throw error;
  }
}

export function assertStudioOrigin(request: Request): void {
  const expected = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto");
  if (host) { expected.port = ""; expected.host = host; }
  if (protocol === "https" || protocol === "http") expected.protocol = `${protocol}:`;
  const origin = request.headers.get("origin");
  if (origin ? origin !== expected.origin : request.headers.get("sec-fetch-site") !== "same-origin")
    throw new ForbiddenError({ message: "Same-origin access required." });
}
