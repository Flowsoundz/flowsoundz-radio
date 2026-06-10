import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  void req;
  const session = await auth();
  if (!session?.user?.email) return Response.json({ error: "Not authenticated." }, { status: 401 });

  const artist = await prisma.artist.findFirst({
    where: { email: session.user.email },
    select: { id: true, name: true },
  });

  if (!artist) return Response.json({ artist: null, payouts: [] });

  const payouts = await prisma.artistPayout.findMany({
    where: { artistId: artist.id },
    orderBy: { month: "desc" },
    include: { pool: { select: { totalRevenue: true, artistPool: true } } },
    take: 24,
  });

  const totalEarned = payouts.reduce((s, p) => s + p.estimatedAmount, 0);
  const totalPaid = payouts.filter((p) => p.paid).reduce((s, p) => s + p.estimatedAmount, 0);

  return Response.json({ artist, payouts, totalEarned, totalPaid });
}
