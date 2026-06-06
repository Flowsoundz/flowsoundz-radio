import { NextResponse } from "next/server";
import { readCatalogSnapshotFromStore } from "@/lib/catalogSnapshotStore";
import { getStaticCatalog } from "@/lib/staticCatalog";
import type { Song } from "@/lib/types";

function normalizeSong(song: Song): Song {
  const publicAudioUrl =
    song.public_audio_url?.trim() ||
    (song.audio_file ? `/audio/${encodeURIComponent(song.audio_file)}` : null);

  return {
    ...song,
    public_audio_url: publicAudioUrl,
    is_playable: song.is_playable ?? Boolean(publicAudioUrl || song.hls_url),
  };
}

function reorderQueue(songs: Song[]) {
  const featured = songs.filter((song) => song.featured || song.is_featured);
  const rest = songs.filter((song) => !featured.includes(song));
  return [...featured, ...rest];
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const vibe = searchParams.get("vibe");
    const snapshot = await readCatalogSnapshotFromStore();
    const baseSongs =
      snapshot.songs.length > 0 ? snapshot.songs : getStaticCatalog();
    const songs = baseSongs.map(normalizeSong);
    const filtered =
      vibe && vibe !== "all"
        ? songs.filter((song) => song.vibe === vibe)
        : songs;

    return NextResponse.json(reorderQueue(filtered), {
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
