import { studioAccess } from "../../../../../../server/browser/studio-auth";
import { nativeVault } from "../../../../../../server/browser/vault/index";
import { safeError, type LoginInput } from "../../../../../../server/browser/vault/types";

export const runtime = "nodejs";
const noStore = { "cache-control": "no-store" };
export async function GET(request: Request) {
  const denied = studioAccess(request);
  if (denied) return denied;
  try {
    return Response.json(
      { status: await nativeVault.status(), items: await nativeVault.list() },
      { headers: noStore },
    );
  } catch (error) {
    return Response.json({ error: safeError(error) }, { status: 500, headers: noStore });
  }
}
export async function POST(request: Request) {
  const denied = studioAccess(request);
  if (denied) return denied;
  try {
    const input = (await request.json()) as LoginInput;
    return Response.json(
      { item: await nativeVault.create(input) },
      { status: 201, headers: noStore },
    );
  } catch (error) {
    return Response.json({ error: safeError(error) }, { status: 400, headers: noStore });
  }
}
export async function PUT(request: Request) {
  const denied = studioAccess(request);
  if (denied) return denied;
  try {
    const body = (await request.json()) as { itemId?: unknown } & LoginInput;
    if (typeof body.itemId !== "string") throw new Error("Vault item not found.");
    return Response.json(
      { item: await nativeVault.update(body.itemId, body) },
      { headers: noStore },
    );
  } catch (error) {
    return Response.json({ error: safeError(error) }, { status: 400, headers: noStore });
  }
}
export async function DELETE(request: Request) {
  const denied = studioAccess(request);
  if (denied) return denied;
  try {
    const itemId = new URL(request.url).searchParams.get("itemId");
    if (!itemId) throw new Error("Vault item not found.");
    await nativeVault.delete(itemId);
    return Response.json({ ok: true }, { headers: noStore });
  } catch (error) {
    return Response.json({ error: safeError(error) }, { status: 400, headers: noStore });
  }
}
