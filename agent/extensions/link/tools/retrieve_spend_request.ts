import { retrieve_spend_request } from "@stripe/link-integrations-eve/tools";
import { runBrowserOperation } from "browsie/runtime";
import { defineTool, type ToolContext } from "eve/tools";
import { freshLinkContext } from "../../../lib/link-auth";

const credentials = new Set(["card", "shared_payment_token", "link_pay_token"]);

async function retrieve(input: Parameters<typeof retrieve_spend_request.execute>[0], ctx: ToolContext) {
  const result = await retrieve_spend_request.execute(input, freshLinkContext(ctx));
  // Eve's general tool type also permits streams; this SDK tool returns one object.
  if (result === null || ("id" in result && "status" in result)) return result;
  throw new Error("Unexpected Link spend-request response.");
}

export default defineTool({
  ...retrieve_spend_request,
  async execute(input, ctx) {
    if (!input.include?.some((value) => credentials.has(value)))
      return retrieve(input, ctx);
    if (process.env.BROWSIE_LOG_SESSION !== "false")
      throw new Error("Set BROWSIE_LOG_SESSION=false before retrieving Link payment credentials.");
    // A callback or a user's 'done' message is not evidence of purchase approval.
    const request = await retrieve({ id: input.id }, ctx);
    if (!request || request.status !== "approved") return request;
    // Verify the actual hosted session, including a session reattached after restart.
    const check = await runBrowserOperation(ctx.session.id, (browser) =>
      browser.withHostedPage(ctx.abortSignal, async () => ({ safe: true })),
    );
    if (!(check.result as { safe?: boolean }).safe)
      throw new Error("Complete the browser handoff before retrieving Link credentials.");
    const result = await retrieve(input, ctx);
    if (result && result.status !== "approved")
      throw new Error("The spend request changed status. Check it again without requesting credentials.");
    return result;
  },
});
