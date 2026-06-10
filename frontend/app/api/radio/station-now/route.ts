import { NextResponse } from "next/server";
import { readCatalogSnapshotFromStore } from "@/lib/catalogSnapshotStore";
import { getStaticCatalog } from "@/lib/staticCatalog";
import { normalizeStationSong } from "@/lib/stationPlayback";
import { getStationNow } from "@/lib/stationClock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Server authority for the station clock. The schedule itself is a pure
// function of time (lib/stationClock), so this endpoint exists for two
// things clients can't do alone: a trustworthy clock (serverNowMs lets
// clients correct device-clock skew) and a catalog-consistent answer for
// surfaces that don't hold a queue (embeds, og images, now-playing widgets).
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const vibe = searchParams.get("vibe") ?? "all";

    const snapshot = await readCatalogSnapshotFromStore();
    const baseSongs = snapshot.songs.length > 0 ? snapshot.songs : getStaticCatalog();
    const songs = baseSongs.map(normalizeStationSong);

    const serverNowMs = Date.now();
    const now = getStationNow(songs, vibe, serverNowMs);

    return NextResponse.json(
      { ...now, serverNowMs, vibe },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[api/radio/station-now] failed", error);
    return NextResponse.json({ error: "Station clock unavailable." }, { status: 500 });
  }
}
