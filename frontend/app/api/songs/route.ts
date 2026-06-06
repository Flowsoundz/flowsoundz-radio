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

export async function GET() {
  try {
    const snapshot = await readCatalogSnapshotFromStore();
    const songs =
      snapshot.songs.length > 0 ? snapshot.songs : getStaticCatalog();

    return NextResponse.json(songs.map(normalizeSong), {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[api/songs] Failed to read catalog snapshot", error);
    return NextResponse.json(
      { error: "Songs unavailable." },
      { status: 500 },
    );
  }
}
