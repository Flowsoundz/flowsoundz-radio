import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendWeeklyDigest } from "@/lib/mailer";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user || !(session.user as { isAdmin?: boolean }).isAdmin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [recentSongs, waitlistCount, userCount] = await Promise.all([
    prisma.song.findMany({
      where: { createdAt: { gte: weekAgo } },
      select: { id: true },
    }),
    prisma.waitlistEntry.count(),
    prisma.user.count({ where: { email: { not: "" } } }),
  ]);

  return Response.json({
    newSongsCount: recentSongs.length,
    waitlistCount,
    userCount,
    totalRecipients: waitlistCount + userCount,
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !(session.user as { isAdmin?: boolean }).isAdmin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { dryRun?: unknown } = {};
  try { body = (await req.json()) as typeof body; } catch { /* ignore */ }
  const dryRun = Boolean(body.dryRun);

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [topSongs, newSongs, waitlist, users] = await Promise.all([
    prisma.queuePreference.findMany({
      orderBy: { playCount: "desc" },
      take: 5,
      include: { song: { include: { artist: { select: { name: true } } } } },
    }),
    prisma.song.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.waitlistEntry.findMany({ select: { email: true } }),
    prisma.user.findMany({ select: { email: true }, where: { email: { not: "" } } }),
  ]);

  const emailSet = new Set<string>();
  for (const w of waitlist) if (w.email) emailSet.add(w.email);
  for (const u of users) if (u.email) emailSet.add(u.email);
  const recipients = dryRun ? [] : [...emailSet];

  const songList = topSongs.map((p) => ({
    title: p.song.title,
    artist: p.song.artist.name,
    plays: p.playCount,
    vibe: p.song.vibe.toLowerCase().replace("_", " "),
  }));

  const now = new Date();
  const weekLabel = now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const result = await sendWeeklyDigest({
    recipients,
    topSongs: songList,
    newSongsCount: newSongs,
    weekLabel,
  });

  return Response.json({
    ok: true,
    dryRun,
    recipients: emailSet.size,
    ...result,
    topSongs: songList,
    newSongsCount: newSongs,
    weekLabel,
  });
}
