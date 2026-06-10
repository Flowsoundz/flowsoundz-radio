import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return Response.json({ songs: [], artists: [] });

  const [songs, artists] = await Promise.all([
    prisma.song.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { genre: { contains: q, mode: "insensitive" } },
          { artist: { name: { contains: q, mode: "insensitive" } } },
        ],
      },
      take: 12,
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      include: {
        artist: { select: { name: true, slug: true } },
        queuePreferences: { select: { playCount: true } },
      },
    }),
    prisma.artist.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { bio: { contains: q, mode: "insensitive" } },
          { artistType: { contains: q, mode: "insensitive" } },
          { profile: { rootsLabel: { contains: q, mode: "insensitive" } } },
        ],
      },
      take: 6,
      orderBy: { createdAt: "desc" },
      include: {
        profile: { select: { heroImageUrl: true, statement: true } },
        songs: { select: { id: true } },
      },
    }),
  ]);

  return Response.json({
    songs: songs.map((s) => ({
      id: s.id,
      slug: s.slug,
      title: s.title,
      artist: s.artist.name,
      artistSlug: s.artist.slug,
      genre: s.genre,
      vibe: s.vibe,
      coverUrl: s.coverUrl,
      isFeatured: s.isFeatured,
      isVault: s.isVault,
      playCount: s.queuePreferences?.playCount ?? 0,
    })),
    artists: artists.map((a) => ({
      id: a.id,
      name: a.name,
      slug: a.slug,
      artistType: a.artistType,
      bio: a.bio,
      heroImageUrl: a.profile?.heroImageUrl ?? null,
      statement: a.profile?.statement ?? null,
      songCount: a.songs.length,
    })),
  });
}
