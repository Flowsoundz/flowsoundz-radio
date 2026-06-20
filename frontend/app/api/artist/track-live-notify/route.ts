import { prisma } from "@/lib/prisma";
import { readCatalogSnapshotFromStore } from "@/lib/catalogSnapshotStore";
import { getStaticCatalog } from "@/lib/staticCatalog";
import { normalizeStationSong } from "@/lib/stationPlayback";
import { getUpcomingAirings, formatAiring } from "@/lib/airTime";
import { sendTrackLiveEmail } from "@/lib/mailer";
import { getSiteUrl } from "@/lib/siteUrl";
import { getWebPush } from "@/lib/webpush";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Fires the "your track is on the air" email to the submitting artist, with
// exact air times from the station clock. Deliberately unauthenticated so the
// mastering worker (which has no session) can ping it after marking a song
// READY — safe because it's strictly idempotent: it only ever sends once per
// submission (liveNotifiedAt claim), only for genuinely READY songs, and only
// to the email already attached to that submission.
const ipLast = new Map<string, number>();

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const now = Date.now();
  if (now - (ipLast.get(ip) ?? 0) < 3_000) {
    return Response.json({ error: "Too fast" }, { status: 429 });
  }
  ipLast.set(ip, now);

  let body: { songId?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid body." }, { status: 400 });
  }
  const songId = typeof body.songId === "string" ? body.songId : "";
  if (!songId) return Response.json({ error: "songId required" }, { status: 400 });

  const song = await prisma.song.findUnique({
    where: { id: songId },
    select: {
      id: true,
      slug: true,
      title: true,
      packagingStatus: true,
      artist: {
        select: {
          id: true,
          name: true,
          slug: true,
          email: true,
          followers: { select: { userId: true } },
        },
      },
    },
  });
  if (!song || song.packagingStatus !== "READY") {
    return Response.json({ ok: false, reason: "not_ready" });
  }

  // Atomic claim — exactly one caller ever sends the email.
  const claim = await prisma.artistSubmission.updateMany({
    where: { publishedSongId: songId, liveNotifiedAt: null },
    data: { liveNotifiedAt: new Date() },
  });
  if (claim.count === 0) {
    return Response.json({ ok: false, reason: "no_submission_or_already_notified" });
  }

  const submission = await prisma.artistSubmission.findFirst({
    where: { publishedSongId: songId },
    select: { email: true, artistName: true, songTitle: true },
  });
  if (!submission?.email) return Response.json({ ok: false, reason: "no_email" });

  // Exact air times from the deterministic schedule.
  let airings: string[] = [];
  try {
    const snapshot = await readCatalogSnapshotFromStore();
    const songs = (snapshot.songs.length > 0 ? snapshot.songs : getStaticCatalog()).map(normalizeStationSong);
    airings = getUpcomingAirings(songs, songId).map((a) => formatAiring(a));
  } catch {
    // email still goes out without times
  }

  await sendTrackLiveEmail(submission.email, {
    artistName: submission.artistName,
    trackTitle: song.title,
    airings,
  });

  const creatorUserIds = song.artist.email
    ? (
        await prisma.user.findMany({
          where: { email: song.artist.email },
          select: { id: true },
        })
      ).map((user) => user.id)
    : [];

  const followerUserIds = song.artist.followers
    .map((follow) => follow.userId)
    .filter((userId): userId is string => Boolean(userId));

  const targetUserIds = [...new Set([...creatorUserIds, ...followerUserIds])];

  let pushSent = 0;
  if (targetUserIds.length > 0) {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: { in: targetUserIds } },
      select: { endpoint: true, p256dh: true, auth: true },
    });

    const siteUrl = getSiteUrl();
    const firstAiring = airings[0] ?? "The current FlowSoundz block";
    const notification = JSON.stringify({
      title: `${song.artist.name} is live on FlowSoundz`,
      body: `${song.title} is on air now. Next window: ${firstAiring}.`,
      url: `${siteUrl}/songs/${song.slug}`,
      icon: `${siteUrl}/FSRLogo.svg`,
      badge: `${siteUrl}/brand/flowsoundz-fr-icon-dark.png`,
    });

    const webpush = getWebPush();
    if (webpush) {
      const results = await Promise.allSettled(
        subscriptions.map((sub) =>
          webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            notification,
          )
        )
      );

      pushSent = results.filter((result) => result.status === "fulfilled").length;
    }
  }

  return Response.json({ ok: true, airings, pushSent });
}
