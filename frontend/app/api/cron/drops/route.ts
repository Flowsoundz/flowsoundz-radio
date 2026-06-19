import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSiteUrl } from "@/lib/siteUrl";
import { getWebPush } from "@/lib/webpush";

export const runtime = "nodejs";

// Called by Vercel cron every 5 minutes
// Sends push notifications for songs that just went live
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const webpush = getWebPush();
  if (!webpush) {
    return NextResponse.json({ ok: false, error: "push not configured" }, { status: 503 });
  }

  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

  // Find songs that went live in the last 5 minutes (either member or public release)
  const liveSongs = await prisma.song.findMany({
    where: {
      OR: [
        { memberReleaseAt: { gte: fiveMinutesAgo, lte: now } },
        { publicReleaseAt: { gte: fiveMinutesAgo, lte: now } },
      ],
    },
    select: {
      id: true,
      title: true,
      coverUrl: true,
      slug: true,
      artist: { select: { name: true } },
      dropNotifies: {
        where: { notifiedAt: null },
        select: { id: true, endpoint: true },
      },
    },
  });

  let sent = 0;
  let failed = 0;

  for (const song of liveSongs) {
    for (const notify of song.dropNotifies) {
      const sub = await prisma.pushSubscription.findUnique({
        where: { endpoint: notify.endpoint },
        select: { endpoint: true, p256dh: true, auth: true },
      });
      if (!sub) continue;

      const siteUrl = getSiteUrl();
      const payload = JSON.stringify({
        title: `🎵 ${song.title} just dropped`,
        body: `${song.artist.name} · Now on FlowSoundz Radio`,
        url: `${siteUrl}/songs/${song.slug}`,
        icon: song.coverUrl ?? `${siteUrl}/FSRLogo.svg`,
      });

      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        );
        await prisma.dropNotify.update({
          where: { id: notify.id },
          data: { notifiedAt: now },
        });
        sent++;
      } catch {
        failed++;
      }
    }
  }

  return NextResponse.json({ ok: true, sent, failed, liveSongs: liveSongs.length });
}
