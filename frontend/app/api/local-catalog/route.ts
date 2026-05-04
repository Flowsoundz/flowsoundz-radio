import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import type { Song } from "@/lib/types";

export const runtime = "nodejs";

const CATALOG_PATH = path.resolve(process.cwd(), "../backend/app/data/catalog.json");

function reorderQueue(songs: Song[]) {
  const featured = songs.filter((song) => song.featured || song.is_featured);
  const rest = songs.filter((song) => !featured.includes(song));
  return [...featured, ...rest];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const vibe = searchParams.get("vibe");

  try {
    const catalogRaw = await readFile(CATALOG_PATH, "utf8");
    const catalog = JSON.parse(catalogRaw) as Song[];
    const normalized = catalog.map((song) => ({
      ...song,
      is_playable: true,
      local_stream: true,
      packaging_status: "ready" as const,
      artist_visual_exists: Boolean(song.artist_visual_file),
      artist_visual_url: song.artist_visual_file
        ? `/api/local-visual/${encodeURIComponent(song.artist_visual_file)}`
        : null,
    }));

    const filtered =
      vibe && vibe !== "all"
        ? normalized.filter((song) => song.vibe === vibe)
        : normalized;

    return NextResponse.json(reorderQueue(filtered));
  } catch (error) {
    console.error("[local-catalog] Failed to read catalog", error);
    return NextResponse.json(
      { error: "Local catalog fallback unavailable." },
      { status: 500 },
    );
  }
}
