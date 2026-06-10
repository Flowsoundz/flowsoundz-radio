import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

// POST { songId, subscription: { endpoint, keys: { p256dh, auth } } }
// Registers a push subscription for a drop notification
export async function POST(req: NextRequest) {
  let body: { songId?: unknown; subscription?: { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } };
  try { body = (await req.json()) as typeof body; }
  catch { return Response.json({ error: "Invalid body." }, { status: 400 }); }

  const songId = typeof body.songId === "string" ? body.songId.trim() : "";
  const endpoint = typeof body.subscription?.endpoint === "string" ? body.subscription.endpoint : "";
  const p256dh = typeof body.subscription?.keys?.p256dh === "string" ? body.subscription.keys.p256dh : "";
  const authKey = typeof body.subscription?.keys?.auth === "string" ? body.subscription.keys.auth : "";

  if (!songId || !endpoint || !p256dh || !authKey) {
    return Response.json({ error: "songId and subscription required." }, { status: 400 });
  }

  const song = await prisma.song.findUnique({ where: { id: songId }, select: { id: true } });
  if (!song) return Response.json({ error: "Song not found." }, { status: 404 });

  const ip = getIp(req);

  // Upsert the push subscription
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { p256dh, auth: authKey },
    create: { endpoint, p256dh, auth: authKey },
  });

  // Register drop notify
  await prisma.dropNotify.upsert({
    where: { songId_endpoint: { songId, endpoint } },
    update: {},
    create: { songId, endpoint, ip },
  });

  return Response.json({ ok: true });
}

// GET ?songId= — check if current endpoint is registered (client passes endpoint as query param)
export async function GET(req: NextRequest) {
  const songId = req.nextUrl.searchParams.get("songId");
  const endpoint = req.nextUrl.searchParams.get("endpoint");
  if (!songId || !endpoint) return Response.json({ registered: false });

  const existing = await prisma.dropNotify.findFirst({
    where: { songId, endpoint },
    select: { id: true },
  });
  return Response.json({ registered: Boolean(existing) });
}
