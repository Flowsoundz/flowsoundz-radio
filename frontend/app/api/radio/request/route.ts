import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET: return request counts for a list of song IDs
// ?ids=id1,id2,id3
export async function GET(request: NextRequest) {
  const ids = request.nextUrl.searchParams.get("ids")?.split(",").filter(Boolean) ?? [];
  if (ids.length === 0) return Response.json({});

  const counts = await prisma.songRequest.groupBy({
    by: ["songId"],
    where: { songId: { in: ids } },
    _count: { songId: true },
  });

  const result: Record<string, number> = {};
  for (const row of counts) result[row.songId] = row._count.songId;
  return Response.json(result);
}

// POST: request a song (one per IP per song)
export async function POST(request: NextRequest) {
  let body: { songId?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid body." }, { status: 400 });
  }

  const songId = typeof body.songId === "string" ? body.songId.trim() : null;
  if (!songId) return Response.json({ error: "songId required." }, { status: 400 });

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  try {
    await prisma.songRequest.create({ data: { songId, ip } });
  } catch {
    // unique constraint — already requested, that's fine
  }

  const count = await prisma.songRequest.count({ where: { songId } });
  return Response.json({ ok: true, count });
}
