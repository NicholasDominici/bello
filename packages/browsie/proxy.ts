import { studioAccess } from "../../server/browser/studio-auth";

export function proxy(request: Request) {
  return studioAccess(request);
}

export const config = { matcher: ["/", "/s/:path*", "/api/:path*"] };
