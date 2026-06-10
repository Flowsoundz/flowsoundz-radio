import { NextResponse } from "next/server";
import { readCatalogSnapshotFromStore } from "@/lib/catalogSnapshotStore";
import { getStaticCatalog } from "@/lib/staticCatalog";
import { normalizeStationSong } from "@/lib/stationPlayback";
import { prisma } from "@/lib/prisma";
import type { Song } from "@/lib/types";

async function reorderQueue(songs: Song[]): Promise<Song[]> {
  const featured = songs.filter((song) => song.featured || song.is_featured);
  const rest = songs.filter((song) => !featured.includes(song));

  // Sort non-featured songs by request count descending
  if (rest.length > 1) {
    const ids = rest.map((s) => s.id);
    const counts = await prisma.songRequest.groupBy({
      by: ["songId"],
      where: { songId: { in: ids } },
      _count: { songId: true },
    });
    const countMap = new Map(counts.map((c) => [c.songId, c._count.songId]));
    rest.sort((a, b) => (countMap.get(b.id) ?? 0) - (countMap.get(a.id) ?? 0));
  }

  return [...featured, ...rest];
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const vibe = searchParams.get("vibe");
    const allowExplicit = searchParams.get("allowExplicit") !== "false";
    const snapshot = await readCatalogSnapshotFromStore();
    const baseSongs =
      snapshot.songs.length > 0 ? snapshot.songs : getStaticCatalog();
    const songs = baseSongs.map(normalizeStationSong);
    const vibeFiltered =
      vibe && vibe !== "all"
        ? songs.filter((song) => song.vibe === vibe)
        : songs;
    const filtered = allowExplicit
      ? vibeFiltered
      : vibeFiltered.filter((song) => !song.is_explicit);

    return NextResponse.json(await reorderQueue(filtered), {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[api/queue] Failed to build queue", error);
    return NextResponse.json(
      { error: "Queue unavailable." },
      { status: 500 },
    );
  }
}
