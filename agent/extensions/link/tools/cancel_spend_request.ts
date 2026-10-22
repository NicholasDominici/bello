import { cancel_spend_request } from "@stripe/link-integrations-eve/tools";
import { defineTool } from "eve/tools";
import { freshLinkContext } from "../../../lib/link-auth";

export default defineTool({ ...cancel_spend_request,
  execute: (input, ctx) => cancel_spend_request.execute(input, freshLinkContext(ctx)),
});
