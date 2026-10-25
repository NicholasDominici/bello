import { beginOAuth, completeOAuth } from "../../../../server/onepassword/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ action: string }> };

export async function GET(request: Request, context: Context) {
  const { action } = await context.params;
  if (action === "start") return beginOAuth();
  if (action === "callback") return completeOAuth(request);
  return new Response(null, { status: 404 });
}
