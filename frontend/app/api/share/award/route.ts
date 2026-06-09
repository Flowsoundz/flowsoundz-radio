import { auth } from "@/auth";
import { awardVibePoints } from "@/lib/vibePoints";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Called when a user shares a track. Awards 25 Vibe Points.
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ ok: false, balance: null });
  }

  const balance = await awardVibePoints(session.user.id, "SHARE");
  return Response.json({ ok: true, balance });
}
