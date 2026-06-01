import type { ArtistProfileRecord } from "@/lib/types";
import { getArtistProfileRecordBySlug, getCatalogSnapshot, slugifyArtistName } from "@/lib/catalogSnapshot";
import type { Song } from "@/lib/types";

export type ArtistProfile = ArtistProfileRecord;

export { slugifyArtistName };

export function buildArtistProfiles(songs: Song[]) {
  return getCatalogSnapshot(songs).artists;
}

export function getArtistProfileBySlug(songs: Song[], slug: string) {
  return getArtistProfileRecordBySlug(songs, slug);
}
