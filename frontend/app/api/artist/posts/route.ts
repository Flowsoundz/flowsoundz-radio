import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import webpush from "web-push";

export const runtime = "nodejs";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT ?? "mailto:flowsoundzradio@gmail.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
  process.env.VAPID_PRIVATE_KEY ?? "",
);

// GET ?artistId= — public feed for an artist
// GET ?mine=1    — authenticated artist's own posts
export async function GET(req: NextRequest) {
  const artistId = req.nextUrl.searchParams.get("artistId");
  const mine = req.nextUrl.searchParams.get("mine") === "1";

  if (mine) {
    const session = await auth();
    const email = session?.user?.email;
    if (!email) return Response.json({ error: "Not authenticated." }, { status: 401 });
    const artist = await prisma.artist.findFirst({ where: { email }, select: { id: true } });
    if (!artist) return Response.json({ error: "No artist." }, { status: 404 });
    const posts = await prisma.artistPost.findMany({
      where: { artistId: artist.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return Response.json({ posts });
  }

  if (!artistId) return Response.json({ error: "artistId required." }, { status: 400 });

  const posts = await prisma.artistPost.findMany({
    where: { artistId },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { id: true, body: true, imageUrl: true, createdAt: true },
  });

  return Response.json({ posts });
}

// POST { body, imageUrl? } — create post + push notify followers
export async function POST(req: NextRequest) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return Response.json({ error: "Not authenticated." }, { status: 401 });

  let payload: { body?: unknown; imageUrl?: unknown };
  try { payload = (await req.json()) as typeof payload; }
  catch { return Response.json({ error: "Invalid body." }, { status: 400 }); }

  const body = typeof payload.body === "string" ? payload.body.trim() : "";
  if (!body || body.length > 1000) {
    return Response.json({ error: "body must be 1-1000 characters." }, { status: 422 });
  }
  const imageUrl = typeof payload.imageUrl === "string" ? payload.imageUrl.trim() || null : null;

  const artist = await prisma.artist.findFirst({
    where: { email },
    select: { id: true, name: true, slug: true, followers: { select: { ip: true, userId: true } } },
  });
  if (!artist) return Response.json({ error: "No artist." }, { status: 404 });

  const post = await prisma.artistPost.create({
    data: { artistId: artist.id, body, imageUrl },
  });

  // Send push notifications to followers who have subscriptions
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://flowsoundzradio.com";
  const notifPayload = JSON.stringify({
    title: `${artist.name} posted`,
    body: body.length > 100 ? body.slice(0, 97) + "…" : body,
    url: `${siteUrl}/artists/${artist.slug}`,
    icon: `${siteUrl}/FSRLogo.svg`,
  });

  // For now notify all push subscribers of this artist via ArtistFollow → userId → PushSubscription
  const userIds = artist.followers
    .map((f) => f.userId)
    .filter((id): id is string => Boolean(id));

  if (userIds.length > 0) {
    const subs = await prisma.pushSubscription.findMany({
      where: { userId: { in: userIds } },
      select: { endpoint: true, p256dh: true, auth: true },
    });

    await Promise.allSettled(
      subs.map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          notifPayload,
        )
      )
    );
  }

  return Response.json({ post });
}
