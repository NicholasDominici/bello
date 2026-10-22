import { create_spend_request } from "@stripe/link-integrations-eve/tools";
import { defineTool } from "eve/tools";
import { freshLinkContext } from "../../../lib/link-auth";

export default defineTool({
  ...create_spend_request,
  // Preserve the extension's always() approval policy.
  execute(input, ctx) {
    if (process.env.BROWSIE_LOG_SESSION !== "false")
      throw new Error("Set BROWSIE_LOG_SESSION=false before using Link checkout.");
    return create_spend_request.execute(input, freshLinkContext(ctx));
  },
});
