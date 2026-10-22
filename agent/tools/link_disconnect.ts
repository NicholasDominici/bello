import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import { z } from "zod";
import { getLinkOAuth, safeLinkCall } from "../../server/link/oauth";
import { linkPrincipal } from "../lib/link-auth";

export default defineTool({
  description: "Disconnect this Linq sender's Link wallet and revoke its OAuth grant. If revocation fails, access stays blocked; retry this tool to finish disconnecting. This does not cancel merchant orders or subscriptions.",
  inputSchema: z.object({}),
  approval: always(),
  async execute(_input, ctx) {
    return safeLinkCall(() => {
      return getLinkOAuth().disconnect(linkPrincipal(ctx));
    });
  },
});
