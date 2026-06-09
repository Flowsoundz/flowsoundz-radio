import { auth } from "@/auth";
import { spendVibePoints } from "@/lib/vibePoints";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: { trackId?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid body." }, { status: 400 });
  }

  if (typeof body.trackId !== "string" || !body.trackId) {
    return Response.json({ error: "trackId required." }, { status: 400 });
  }

  const result = await spendVibePoints(session.user.id, body.trackId);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 402 });
  }

  return Response.json({ balance: result.balance });
}
