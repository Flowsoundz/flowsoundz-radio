import type { Song } from "@/lib/types";

export const CURATED_CATALOG_FALLBACK: Song[] = [];

export function getCuratedCatalog(vibe?: string): Song[] {
  void vibe;
  return CURATED_CATALOG_FALLBACK;
}
