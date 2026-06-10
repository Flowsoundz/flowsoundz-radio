import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function GET(req: NextRequest) {
  const songId = req.nextUrl.searchParams.get("songId");
  if (!songId) return Response.json({ error: "songId required" }, { status: 400 });

  const ip = getIp(req);
  const session = await auth();

  const [favorite, count] = await Promise.all([
    prisma.songFavorite.findFirst({
      where: { songId, ip },
      select: { id: true },
    }),
    prisma.songFavorite.count({ where: { songId } }),
  ]);

  return Response.json({
    favorited: Boolean(favorite),
    count,
    userId: session?.user?.email ?? null,
  });
}

export async function POST(req: NextRequest) {
  let body: { songId?: unknown; action?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const songId = typeof body.songId === "string" ? body.songId.trim() : "";
  if (!songId) return Response.json({ error: "songId required" }, { status: 400 });

  const ip = getIp(req);
  const session = await auth();
  const userId = (session?.user as { id?: string } | null)?.id ?? null;

  const existing = await prisma.songFavorite.findFirst({ where: { songId, ip } });

  if (existing) {
    await prisma.songFavorite.delete({ where: { id: existing.id } });
  } else {
    await prisma.songFavorite.create({ data: { songId, ip, userId } });
  }

  const count = await prisma.songFavorite.count({ where: { songId } });
  return Response.json({ favorited: !existing, count });
}
