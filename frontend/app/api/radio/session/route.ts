import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTIVE_WINDOW_MS = 2 * 60 * 1000; // 2 minutes

export async function POST(request: NextRequest) {
  let body: { sessionId?: unknown; songId?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid body." }, { status: 400 });
  }

  const sessionId = typeof body.sessionId === "string" ? body.sessionId : null;
  if (!sessionId) return Response.json({ error: "sessionId required." }, { status: 400 });

  const songId = typeof body.songId === "string" ? body.songId : null;

  await prisma.radioSession.upsert({
    where: { sessionId },
    create: {
      sessionId,
      lastSeenAt: new Date(),
      ...(songId ? { currentSongId: songId } : {}),
    },
    update: {
      lastSeenAt: new Date(),
      ...(songId ? { currentSongId: songId } : {}),
    },
  });

  return Response.json({ ok: true });
}

export async function GET() {
  const since = new Date(Date.now() - ACTIVE_WINDOW_MS);
  const count = await prisma.radioSession.count({
    where: { lastSeenAt: { gte: since } },
  });
  return Response.json({ count });
}
