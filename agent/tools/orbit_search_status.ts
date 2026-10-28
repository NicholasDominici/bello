/** Poll only this conversation's Orbit searches; terminal snapshots never poll again. */
import { defineTool, toolOutput } from "eve/tools";
import { z } from "zod";
import { OrbitClient, OrbitError } from "../../server/orbit";
import { assertOrbitOperator, cachedSearch, orbitFailure, orbitState, rememberSearch } from "../lib/orbit";

export default defineTool({
  description: "Read the status of an Orbit search started in this conversation. Wait the previous poll_after_ms first. Completed and completed_with_errors are terminal; retain ready results and stop polling. Never create a replacement search because a request is slow.",
  inputSchema: z.object({ search_id: z.string().min(1).max(200) }),
  async execute({ search_id }, ctx) {
    try {
      assertOrbitOperator(ctx);
      const receipt = orbitState.get().receipts.find(row => row.snapshot?.search_id === search_id);
      if (!receipt) throw new OrbitError("unknown_search", "This search was not started in this conversation. Use its original conversation to resume it.");
      const cached = cachedSearch(receipt);
      if (cached) return cached;
      const snapshot = await new OrbitClient().status(search_id, ctx.abortSignal);
      rememberSearch(receipt.requestId, snapshot);
      return snapshot;
    } catch (error) { ctx.abortSignal.throwIfAborted(); return orbitFailure(error); }
  },
  toModelOutput: output => toolOutput.json(output),
});
