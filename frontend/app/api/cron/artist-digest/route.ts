import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCreatorDashboard } from "@/lib/creatorDashboard";
import { sendArtistDigest } from "@/lib/mailer";

export const runtime = "nodejs";
export const maxDuration = 60;

// Weekly per-artist performance digest. Triggered by Vercel cron (see
// vercel.json). Sends every artist with a live track their numbers + next air
// time + a one-tap share — the retention loop that pulls them back.
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Distinct artist emails that have at least one published track.
  const subs = await prisma.artistSubmission.findMany({
    where: { publishedSongId: { not: null }, email: { not: "" } },
    select: { email: true },
    distinct: ["email"],
  });

  const weekLabel = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" });
  let sent = 0;

  for (const { email } of subs) {
    try {
      const dash = await getCreatorDashboard(email);
      if (!dash || dash.totals.liveTracks === 0) continue;
      const live = dash.tracks.filter((t) => t.status === "live").sort((a, b) => b.plays - a.plays);
      await sendArtistDigest(email, {
        artistName: dash.artistName,
        weekLabel,
        totals: {
          plays: dash.totals.plays,
          fires: dash.totals.fires,
          favorites: dash.totals.favorites,
          bestRank: dash.totals.bestRank,
        },
        topTrack: live[0]
          ? { title: live[0].title, plays: live[0].plays, fires: live[0].fires, nextAiring: live[0].nextAiring }
          : null,
      });
      sent++;
    } catch {
      // one artist's failure never blocks the rest
    }
  }

  return NextResponse.json({ ok: true, artists: subs.length, sent });
}
