import { request_spend_approval } from "@stripe/link-integrations-eve/tools";
import { defineTool } from "eve/tools";
import { freshLinkContext } from "../../../lib/link-auth";

export default defineTool({ ...request_spend_approval,
  execute: (input, ctx) => request_spend_approval.execute(input, freshLinkContext(ctx)),
});
