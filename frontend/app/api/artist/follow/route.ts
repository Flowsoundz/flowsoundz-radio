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

// GET ?artistId= → { following, count }
export async function GET(req: NextRequest) {
  const artistId = req.nextUrl.searchParams.get("artistId");
  if (!artistId) return Response.json({ error: "artistId required" }, { status: 400 });

  const ip = getIp(req);

  const [follow, count] = await Promise.all([
    prisma.artistFollow.findFirst({ where: { artistId, ip }, select: { id: true } }),
    prisma.artistFollow.count({ where: { artistId } }),
  ]);

  return Response.json({ following: Boolean(follow), count });
}

// POST { artistId } → toggle follow
export async function POST(req: NextRequest) {
  let body: { artistId?: unknown };
  try { body = (await req.json()) as typeof body; }
  catch { return Response.json({ error: "Invalid body." }, { status: 400 }); }

  const artistId = typeof body.artistId === "string" ? body.artistId.trim() : "";
  if (!artistId) return Response.json({ error: "artistId required." }, { status: 400 });

  const ip = getIp(req);
  const session = await auth();
  const userId = session?.user ? (session.user as { id?: string }).id ?? null : null;

  const existing = await prisma.artistFollow.findFirst({ where: { artistId, ip } });

  if (existing) {
    await prisma.artistFollow.delete({ where: { id: existing.id } });
  } else {
    await prisma.artistFollow.create({ data: { artistId, ip, userId } });
  }

  const count = await prisma.artistFollow.count({ where: { artistId } });
  return Response.json({ following: !existing, count });
}
