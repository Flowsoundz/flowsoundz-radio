import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SongVibe } from "@prisma/client";

export const runtime = "nodejs";

function slug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function uniqueSlug(base: string): Promise<string> {
  let candidate = base;
  let n = 0;
  while (await prisma.song.findUnique({ where: { slug: candidate } })) {
    n++;
    candidate = `${base}-${n}`;
  }
  return candidate;
}

export async function GET() {
  const session = await auth();
  if (!session?.user || !(session.user as { isAdmin?: boolean }).isAdmin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const songs = await prisma.song.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { artist: { select: { name: true, slug: true } } },
  });

  return Response.json({ songs });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !(session.user as { isAdmin?: boolean }).isAdmin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    artistId?: unknown;
    newArtistName?: unknown;
    title?: unknown;
    genre?: unknown;
    vibe?: unknown;
    audioUrl?: unknown;
    coverUrl?: unknown;
    durationSec?: unknown;
    isFeatured?: unknown;
    isVault?: unknown;
    isExplicit?: unknown;
    isAiGenerated?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const genre = typeof body.genre === "string" ? body.genre.trim() : "";
  const audioUrl = typeof body.audioUrl === "string" ? body.audioUrl.trim() : "";
  const vibeRaw = typeof body.vibe === "string" ? body.vibe.toUpperCase().replace(" ", "_") : "";
  const VALID_VIBES = ["CHILL", "HYPE", "LATE_NIGHT", "EMOTIONAL", "UNSURE"];
  const vibe = (VALID_VIBES.includes(vibeRaw) ? vibeRaw : "CHILL") as SongVibe;

  if (!title || !genre || !audioUrl) {
    return Response.json({ error: "title, genre, and audioUrl are required" }, { status: 422 });
  }

  let artistId = typeof body.artistId === "string" ? body.artistId.trim() : "";
  const newArtistName = typeof body.newArtistName === "string" ? body.newArtistName.trim() : "";

  if (!artistId && newArtistName) {
    const artistSlug = await (async () => {
      let base = slug(newArtistName);
      let candidate = base;
      let n = 0;
      while (await prisma.artist.findUnique({ where: { slug: candidate } })) {
        n++;
        candidate = `${base}-${n}`;
      }
      return candidate;
    })();
    const artist = await prisma.artist.create({
      data: { name: newArtistName, slug: artistSlug },
    });
    artistId = artist.id;
  }

  if (!artistId) {
    return Response.json({ error: "artistId or newArtistName required" }, { status: 422 });
  }

  const songSlug = await uniqueSlug(slug(`${title}`));

  const song = await prisma.song.create({
    data: {
      artistId,
      title,
      slug: songSlug,
      genre,
      vibe,
      audioUrl,
      coverUrl: typeof body.coverUrl === "string" ? body.coverUrl.trim() || null : null,
      durationSec: typeof body.durationSec === "number" ? body.durationSec : null,
      isFeatured: Boolean(body.isFeatured),
      isVault: Boolean(body.isVault),
      isExplicit: Boolean(body.isExplicit),
      isAiGenerated: Boolean(body.isAiGenerated),
    },
    include: { artist: { select: { name: true, slug: true } } },
  });

  return Response.json({ ok: true, song });
}
