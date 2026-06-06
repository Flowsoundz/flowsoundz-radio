import { NextResponse } from "next/server";
import { readCatalogSnapshotFromStore } from "@/lib/catalogSnapshotStore";
import { getStaticCatalog } from "@/lib/staticCatalog";
import { normalizeStationSong } from "@/lib/stationPlayback";

export async function GET() {
  try {
    const snapshot = await readCatalogSnapshotFromStore();
    const songs =
      snapshot.songs.length > 0 ? snapshot.songs : getStaticCatalog();

    return NextResponse.json(songs.map(normalizeStationSong), {
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
