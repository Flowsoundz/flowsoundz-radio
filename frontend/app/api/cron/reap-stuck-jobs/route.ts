import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendAdminAlert } from "@/lib/mailer";

export const runtime = "nodejs";

// Mastering-worker safety net + health check (Vercel cron, daily).
//  1. Reset Songs stuck in PROCESSING >30min back to PENDING (worker crashed
//     mid-transcode) so they get re-claimed instead of blocking forever.
//  2. If jobs are sitting in PENDING for >1h, the worker is likely down/stalled
//     — email the admin so it gets a look.
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const now = Date.now();
  const requeued = await prisma.song.updateMany({
    where: { packagingStatus: "PROCESSING", updatedAt: { lt: new Date(now - 30 * 60 * 1000) } },
    data: { packagingStatus: "PENDING" },
  });

  // Stale PENDING (incl. anything just requeued) → worker probably isn't running.
  const stalePending = await prisma.song.count({
    where: { packagingStatus: "PENDING", updatedAt: { lt: new Date(now - 60 * 60 * 1000) } },
  });

  if (stalePending > 0) {
    await sendAdminAlert("Mastering worker may be down", [
      `${stalePending} track(s) have been waiting in PENDING for over an hour.`,
      `${requeued.count} were just requeued from a stuck PROCESSING state.`,
      "Check the Railway worker — if it's stopped, tracks won't go live.",
    ]);
  }

  return NextResponse.json({ ok: true, requeued: requeued.count, stalePending });
}
