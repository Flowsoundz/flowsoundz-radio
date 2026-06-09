import { auth } from "@/auth";
import { awardVibePoints, getVibeBalance } from "@/lib/vibePoints";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Called by the client every 5 minutes while the radio is playing.
// Awards 10 points per call; client is responsible for the interval.
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  const balance = await awardVibePoints(session.user.id, "LISTEN_5MIN");
  return Response.json({ balance });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ balance: null });
  }
  const balance = await getVibeBalance(session.user.id);
  return Response.json({ balance });
}
