import { defineInteractiveAuthorization, isConnectionAuthorizationRequiredError, type ConnectionPrincipal } from "eve/connections";
import type { ToolContext } from "eve/tools";
import { getLinkOAuth, linkOwner, safeLinkCall, type LinkResume } from "../../server/link/oauth";

export function createLinkAuth(service = getLinkOAuth) {
  return defineInteractiveAuthorization<LinkResume>({
    displayName: "Link",
    getToken: ({ principal }) => safeLinkCall(() => {
      linkOwner(principal);
      return service().getToken(principal);
    }),
    evict: ({ principal }) => safeLinkCall(() => {
      linkOwner(principal);
      return service().evict(principal);
    }),
    startAuthorization: ({ principal, callbackUrl }) => safeLinkCall(() => {
      linkOwner(principal);
      return service().start(principal, callbackUrl);
    }),
    completeAuthorization: ({ principal, callbackUrl, resume, callback }) => safeLinkCall(() => {
      linkOwner(principal);
      return service().complete(principal, callbackUrl, resume, callback.params);
    }),
  });
}

export const linkAuth = createLinkAuth();

export function linkPrincipal(ctx: ToolContext): ConnectionPrincipal {
  const auth = ctx.session.auth.current;
  const principal: ConnectionPrincipal = auth?.principalType === "user" && auth.authenticator === "linq-message"
    ? { type: "user", id: auth.principalId, issuer: auth.issuer }
    : { type: "app" };
  linkOwner(principal);
  return principal;
}

/** Preserve Eve's authorization pause/resume, then recheck the database before each
 * native SDK request. A step-cached bearer must not bypass a concurrent disconnect,
 * particularly while credential retrieval waits for browser readiness.
 */
export function freshLinkContext(ctx: ToolContext): ToolContext {
  return {
    ...ctx,
    async getToken(provider) {
      await ctx.getToken(provider);
      try {
        return await provider.getToken({ principal: linkPrincipal(ctx), connection: { url: "" } });
      } catch (error) {
        if (isConnectionAuthorizationRequiredError(error)) ctx.requireAuth(provider);
        throw error;
      }
    },
  };
}
