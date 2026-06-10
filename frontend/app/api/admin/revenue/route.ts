import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// GET /api/admin/revenue — list pools + per-pool payout summary
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !(session.user as { isAdmin?: boolean }).isAdmin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const [pools, totalPlaysAllTime] = await Promise.all([
    prisma.revenuePool.findMany({
      orderBy: { month: "desc" },
      include: {
        payouts: {
          include: { artist: { select: { name: true, slug: true } } },
          orderBy: { estimatedAmount: "desc" },
        },
      },
      take: 12,
    }),
    prisma.queuePreference.aggregate({ _sum: { playCount: true } }),
  ]);

  return Response.json({
    pools,
    totalPlaysAllTime: totalPlaysAllTime._sum.playCount ?? 0,
  });
}

// POST /api/admin/revenue — create/update pool and compute payouts
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !(session.user as { isAdmin?: boolean }).isAdmin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { month?: string; totalRevenue?: number; artistPoolPct?: number; notes?: string };
  try { body = (await req.json()) as typeof body; }
  catch { return Response.json({ error: "Invalid body." }, { status: 400 }); }

  const month = (body.month ?? "").trim();
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return Response.json({ error: "month must be YYYY-MM." }, { status: 422 });
  }

  const totalRevenue = Number(body.totalRevenue ?? 0);
  const pct = Math.min(Math.max(Number(body.artistPoolPct ?? 30), 0), 100);
  const artistPool = Math.round((totalRevenue * pct) / 100 * 100) / 100;

  // Upsert the pool
  const pool = await prisma.revenuePool.upsert({
    where: { month },
    update: { totalRevenue, artistPool, notes: body.notes ?? null, distributed: false },
    create: { month, totalRevenue, artistPool, notes: body.notes ?? null },
  });

  // Compute per-artist play counts for the month
  // We use all-time QueuePreference playCount as a proxy (best available without per-month tracking)
  const songs = await prisma.song.findMany({
    select: {
      artistId: true,
      queuePreferences: { select: { playCount: true } },
    },
  });

  // Aggregate plays by artist
  const artistPlayMap = new Map<string, number>();
  for (const s of songs) {
    const plays = s.queuePreferences?.playCount ?? 0;
    artistPlayMap.set(s.artistId, (artistPlayMap.get(s.artistId) ?? 0) + plays);
  }

  const totalPlays = Array.from(artistPlayMap.values()).reduce((a, b) => a + b, 0);

  if (totalPlays === 0) {
    return Response.json({ pool, payoutsCreated: 0, totalPlays: 0 });
  }

  // Upsert payouts for every artist with plays
  let payoutsCreated = 0;
  for (const [artistId, playCount] of artistPlayMap.entries()) {
    if (playCount === 0) continue;
    const playShare = playCount / totalPlays;
    const estimatedAmount = Math.round(playShare * artistPool * 100) / 100;

    await prisma.artistPayout.upsert({
      where: { poolId_artistId: { poolId: pool.id, artistId } },
      update: { playCount, totalPlays, playShare, estimatedAmount, paid: false },
      create: { poolId: pool.id, artistId, month, playCount, totalPlays, playShare, estimatedAmount },
    });
    payoutsCreated++;
  }

  return Response.json({ pool, payoutsCreated, totalPlays });
}

// PATCH /api/admin/revenue — mark payout as paid
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !(session.user as { isAdmin?: boolean }).isAdmin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { payoutId?: string; paid?: boolean };
  try { body = (await req.json()) as typeof body; }
  catch { return Response.json({ error: "Invalid body." }, { status: 400 }); }

  if (!body.payoutId) return Response.json({ error: "payoutId required." }, { status: 400 });

  const payout = await prisma.artistPayout.update({
    where: { id: body.payoutId },
    data: { paid: body.paid ?? true, paidAt: body.paid !== false ? new Date() : null },
  });

  return Response.json({ payout });
}
