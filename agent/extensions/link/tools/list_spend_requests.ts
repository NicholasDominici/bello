import { list_spend_requests } from "@stripe/link-integrations-eve/tools";
import { defineTool } from "eve/tools";
import { freshLinkContext } from "../../../lib/link-auth";

export default defineTool({ ...list_spend_requests,
  execute: (input, ctx) => list_spend_requests.execute(input, freshLinkContext(ctx)),
});
