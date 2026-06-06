import { readCatalogSnapshotFromStore } from "@/lib/catalogSnapshotStore";
import { getStaticCatalog } from "@/lib/staticCatalog";
import { normalizeStationSong } from "@/lib/stationPlayback";
import type { Song } from "@/lib/types";

export async function readAdminCatalogSongs(): Promise<Song[]> {
  const snapshot = await readCatalogSnapshotFromStore();
  const songs = snapshot.songs.length > 0 ? snapshot.songs : getStaticCatalog();
  return songs.map(normalizeStationSong);
}
