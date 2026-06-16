import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Safety net for the mastering worker: if it crashes mid-transcode a Song is
// left in PROCESSING forever and that artist's track never goes live. Reset
// anything stuck in PROCESSING for >30min back to PENDING so the worker
// re-claims it. Triggered by Vercel cron (see vercel.json).
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const cutoff = new Date(Date.now() - 30 * 60 * 1000);
  const result = await prisma.song.updateMany({
    where: { packagingStatus: "PROCESSING", updatedAt: { lt: cutoff } },
    data: { packagingStatus: "PENDING" },
  });

  return NextResponse.json({ ok: true, requeued: result.count });
}
