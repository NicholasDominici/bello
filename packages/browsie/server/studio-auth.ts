import { verifyHttpBasic } from "eve/channels/auth";

export function studioCredentials() {
  const username = process.env.BROWSIE_STUDIO_USERNAME?.trim();
  const password = process.env.BROWSIE_STUDIO_PASSWORD;
  return username && !username.includes(":") && password && Buffer.byteLength(password) >= 32
    ? { username, password } : undefined;
}

export function studioAuth(request: Request) {
  const credentials = studioCredentials();
  if (!credentials) return null;
  const result = verifyHttpBasic(request.headers.get("authorization"), credentials);
  return result.ok ? result.sessionAuth : null;
}

export function studioAccess(request: Request): Response | undefined {
  const headers = { "cache-control": "no-store" };
  if (!studioCredentials())
    return Response.json({ error: "Management access is not configured." }, { status: 503, headers });
  if (!studioAuth(request))
    return Response.json({ error: "Operator sign-in required." }, {
      status: 401, headers: { ...headers, "www-authenticate": 'Basic realm="Browsie", charset="UTF-8"' },
    });
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    try { assertStudioOrigin(request); }
    catch { return Response.json({ error: "Same-origin access required." }, { status: 403, headers }); }
  }
}

export function assertStudioOrigin(request: Request): void {
  const expected = new URL(request.url);
  const host = request.headers.get("host");
  if (host) expected.host = host;
  const origin = request.headers.get("origin");
  if (origin ? origin !== expected.origin : request.headers.get("sec-fetch-site") !== "same-origin")
    throw new Error("Same-origin access required.");
}
